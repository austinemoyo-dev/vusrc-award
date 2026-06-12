-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Students (imported from CAMS CSV export)
CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matric_number         VARCHAR UNIQUE NOT NULL,
  full_name             VARCHAR NOT NULL,
  department            VARCHAR,
  level                 VARCHAR,
  phone_number          VARCHAR,
  pin_hash              VARCHAR,
  pin_set               BOOLEAN DEFAULT false,
  initializer_device    VARCHAR,
  initializer_locked    BOOLEAN DEFAULT false,
  failed_attempts       INT DEFAULT 0,
  locked_until          TIMESTAMP WITH TIME ZONE,
  session_token         VARCHAR,
  session_expires       TIMESTAMP WITH TIME ZONE,
  last_login_at         TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device registry (one device = one account initialization)
CREATE TABLE device_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint    VARCHAR UNIQUE NOT NULL,
  initialized_for       UUID REFERENCES students(id) ON DELETE CASCADE,
  initialized_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Award categories
CREATE TABLE categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR NOT NULL,
  slug                  VARCHAR UNIQUE NOT NULL,
  description           TEXT NOT NULL,
  banner_url            VARCHAR,
  day_number            INT,
  opens_at              TIMESTAMP WITH TIME ZONE,
  closes_at             TIMESTAMP WITH TIME ZONE,
  is_visible            BOOLEAN DEFAULT false,
  is_open               BOOLEAN DEFAULT false,
  is_revealed           BOOLEAN DEFAULT false,
  display_order         INT DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nominees per category
CREATE TABLE nominees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id           UUID REFERENCES categories(id) ON DELETE CASCADE,
  full_name             VARCHAR NOT NULL,
  photo_url             VARCHAR NOT NULL,
  bio                   TEXT,
  department            VARCHAR,
  level                 VARCHAR,
  override_votes        INT DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes (unique constraint is the integrity lock)
CREATE TABLE votes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES students(id) ON DELETE CASCADE,
  nominee_id            UUID REFERENCES nominees(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES categories(id) ON DELETE CASCADE,
  voted_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, category_id)
);

-- Admins and superadmins
CREATE TABLE admins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR UNIQUE NOT NULL,
  password_hash         VARCHAR NOT NULL,
  role                  VARCHAR DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Superadmin vote overrides (fully audited)
CREATE TABLE vote_overrides (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id         UUID REFERENCES admins(id),
  nominee_id            UUID REFERENCES nominees(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES categories(id) ON DELETE CASCADE,
  transfer_to_nominee_id UUID REFERENCES nominees(id) ON DELETE SET NULL,
  action                VARCHAR NOT NULL CHECK (action IN ('add', 'remove', 'transfer')),
  votes_delta           INT NOT NULL,
  reason                TEXT NOT NULL,
  performed_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PIN reset audit log
CREATE TABLE pin_reset_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES students(id) ON DELETE CASCADE,
  reset_by              VARCHAR NOT NULL,
  reset_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Display state (single row, Realtime-synced)
CREATE TABLE display_state (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_category_id   UUID REFERENCES categories(id),
  current_screen        VARCHAR DEFAULT 'intro' CHECK (current_screen IN ('intro', 'parade', 'drumroll', 'reveal', 'leaderboard')),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed one display_state row
INSERT INTO display_state (id) VALUES (gen_random_uuid());

-- Indexes for performance
CREATE INDEX idx_votes_student ON votes(student_id);
CREATE INDEX idx_votes_category ON votes(category_id);
CREATE INDEX idx_votes_nominee ON votes(nominee_id);
CREATE INDEX idx_nominees_category ON nominees(category_id);
CREATE INDEX idx_students_matric ON students(matric_number);
CREATE INDEX idx_device_fingerprint ON device_registry(device_fingerprint);

-- ─────────────────────────────────────────────────
-- Phase 5: Display mode
-- ─────────────────────────────────────────────────

-- Aggregated vote totals per nominee (organic + admin overrides)
CREATE OR REPLACE VIEW nominee_vote_totals AS
SELECT
  n.id,
  n.category_id,
  n.full_name,
  n.photo_url,
  n.bio,
  n.department,
  n.level,
  n.override_votes,
  COUNT(v.id)::INT                           AS organic_votes,
  (COUNT(v.id) + n.override_votes)::INT      AS total_votes
FROM nominees n
LEFT JOIN votes v ON v.nominee_id = n.id
GROUP BY n.id;

-- Allow anonymous/public reads on display_state so Realtime postgres_changes
-- fires on the display page without authentication
ALTER TABLE display_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_display_state"
  ON display_state FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────
-- Phase 6: Atomic transfer stored procedure
-- ─────────────────────────────────────────────────

-- Transfers override votes from one nominee to another in a single transaction.
-- Called via supabase.rpc('execute_override_transfer', {...}).
CREATE OR REPLACE FUNCTION execute_override_transfer(
  p_from_nominee_id UUID,
  p_to_nominee_id   UUID,
  p_delta           INT
) RETURNS VOID AS $$
BEGIN
  UPDATE nominees
  SET override_votes = GREATEST(0, override_votes - p_delta)
  WHERE id = p_from_nominee_id;

  UPDATE nominees
  SET override_votes = override_votes + p_delta
  WHERE id = p_to_nominee_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────
-- Phase 7+: Push notification subscriptions
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_student_idx ON push_subscriptions(student_id);

-- Only the service role can read/write push subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only_push_subscriptions"
  ON push_subscriptions
  USING (false);

-- ─────────────────────────────────────────────────
-- Phase 8: Account creation toggle
-- ─────────────────────────────────────────────────

-- Whether new students can create an account (set their PIN for the first time).
-- Existing students with a PIN can still log in regardless of this flag.
ALTER TABLE display_state ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT true;

-- ─────────────────────────────────────────────────
-- Phase 9: Fix vote_overrides transfer support
-- ─────────────────────────────────────────────────

-- Live table was created before transfer_to_nominee_id existed in this file.
ALTER TABLE vote_overrides ADD COLUMN IF NOT EXISTS transfer_to_nominee_id UUID REFERENCES nominees(id) ON DELETE SET NULL;

-- Live database never had this function, so transfers were silently using the
-- sequential-update fallback. Create it so transfers run atomically.
-- Note: override_votes is allowed to go negative on the source — it is a net
-- adjustment against organic votes, and a transfer must conserve the total
-- (source total -delta, target total +delta).
CREATE OR REPLACE FUNCTION execute_override_transfer(
  p_from_nominee_id UUID,
  p_to_nominee_id   UUID,
  p_delta           INT
) RETURNS VOID AS $$
BEGIN
  UPDATE nominees
  SET override_votes = override_votes - p_delta
  WHERE id = p_from_nominee_id;

  UPDATE nominees
  SET override_votes = override_votes + p_delta
  WHERE id = p_to_nominee_id;
END;
$$ LANGUAGE plpgsql;
