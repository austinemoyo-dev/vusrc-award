-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_reset_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- students: no public read — server-only via service role
-- ============================================================
-- No public policies; all access goes through service role key in API routes.

-- ============================================================
-- device_registry: service role only
-- ============================================================
-- No public policies.

-- ============================================================
-- categories: public read for visible rows; admin write via service role
-- ============================================================
CREATE POLICY "Public can read visible categories"
  ON categories FOR SELECT
  USING (is_visible = true);

-- ============================================================
-- nominees: public read if the parent category is visible
-- ============================================================
CREATE POLICY "Public can read nominees of visible categories"
  ON nominees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = nominees.category_id
        AND c.is_visible = true
    )
  );

-- ============================================================
-- votes: no public read; inserts handled server-side via service role
-- ============================================================
-- No public policies. API routes use service role key to validate
-- the student session token before inserting.

-- ============================================================
-- admins: service role only
-- ============================================================
-- No public policies.

-- ============================================================
-- vote_overrides: service role only
-- ============================================================
-- No public policies.

-- ============================================================
-- pin_reset_log: service role only
-- ============================================================
-- No public policies.

-- ============================================================
-- display_state: public read; service role write
-- ============================================================
CREATE POLICY "Public can read display state"
  ON display_state FOR SELECT
  USING (true);
