# VUSRC Awards Platform
## Product Requirements Document
**Version:** 1.0  
**Stage:** Planning  
**Prepared by:** Augustine (Austine Moyo)  
**Date:** June 2026

---

## 1. Project Overview

| Field | Detail |
|---|---|
| **Product Name** | VUSRC Awards Platform |
| **Purpose** | Secure web platform for Vision University students to vote for award nominees during student week, with a cinematic display mode for the reveal night |
| **Event Duration** | 7 days (Student Week) |
| **Voting Audience** | All Vision University students (whitelisted from CAMS export) |
| **Aesthetic** | Dark, cinematic, luxury |

---

## 2. Core Principles

- Only verified VU students can vote
- One vote per student per category — enforced at DB level via unique constraint
- One device can only initialize (set PIN for) one account ever
- Results are hidden from all public routes until superadmin reveals on event night
- Award categories drip per day — not all released at once
- Every sensitive action (PIN reset, vote override) is fully audited

---

## 3. User Roles

| Role | Access Level |
|---|---|
| **Student** | Login, browse categories, vote once per category |
| **Admin** | Manage categories, nominees, view results, reset student PINs |
| **Superadmin** | Everything Admin has + vote override panel + admin management |

---

## 4. Authentication System

### 4.1 Student Auth Flow

**Credentials:** Matric number + PIN

**First-time login (PIN Setup):**
1. Student enters matric number
2. System generates device fingerprint silently (canvas + screen + userAgent + hardwareConcurrency — hashed)
3. Check `device_registry`: has this device initialized an account before?
   - **YES** → Block: *"A PIN has already been set up from this device. Please log in instead."*
   - **NO** → Continue
4. Check `students` table: does matric number exist?
   - **NO** → Error: *"Matric number not recognized"*
   - **YES** → Continue
5. Check `pin_set`: has this account already been initialized?
   - **YES** → *"This account already has a PIN. Log in instead."*
   - **NO** → Continue
6. Student sets new PIN (entered twice to confirm)
7. System:
   - Hashes PIN with bcrypt
   - Updates `students.pin_hash`, `students.pin_set = true`, `students.initializer_device`
   - Inserts row into `device_registry`
   - Issues session (httpOnly cookie, JWT)

**Returning login:**
1. Enter matric number → exists check
2. Enter PIN → bcrypt verify
3. On success → session issued
4. On failure → increment `failed_attempts`; after 5 failures → 30-minute lockout (`locked_until`)

**Device binding rule:**
- One phone can only **initialize** (set PIN for) one account ever
- Any phone can **log in** to any already-initialized account
- This prevents a student from setting up someone else's account before them

**PIN reset:**
- Admin-only action from the admin panel
- Clears: `pin_hash`, `pin_set`, `initializer_device`, `initializer_locked`, corresponding `device_registry` row
- Student can re-initialize from any phone after reset
- Every reset is logged in `pin_reset_log` with admin ID + timestamp

### 4.2 Session

- httpOnly cookie, JWT
- 24-hour expiry or until voting window closes (whichever comes first)
- One active session per student (new login invalidates previous session)

### 4.3 Admin Auth

- Email + password (bcrypt)
- Superadmin role enforced at DB level and in all middleware
- Superadmin override actions require password re-entry at time of action

---

## 5. Feature Specifications

### 5.1 Landing Page — `/`

- VUSRC Awards hero section
- Event name and countdown timer to voting open
- Brief description of the awards event
- CTA: **"Vote Now"** → redirects to `/login` if not authenticated
- VUSRC logo (placeholder until asset provided)
- Dark cinematic aesthetic, gold accents

---

### 5.2 Student Login — `/login`

- Matric number input
- System detects: first-time or returning user
- First-time → PIN setup screen (two-field confirmation)
- Returning → PIN entry screen
- Error states:
  - Unrecognized matric number
  - Wrong PIN (with attempt counter)
  - Device already initialized another account
  - Account locked (shows unlock time)
  - Account not yet initialized (prompt to set PIN)

---

### 5.3 Category Browser — `/vote`

Grid of all categories. Each card has one of three states:

| State | Appearance | Behavior |
|---|---|---|
| **Locked** | Blurred, "Day 3 — Coming Soon" badge | No nominee info, no CTA |
| **Open** | Full info, nominee count, "Vote Now" CTA | Clickable, leads to category page |
| **Voted** | Checkmark, "Vote Cast" badge | Locked, no re-vote |

Categories unlock per day based on admin-set schedule.

---

### 5.4 Category Detail + Voting — `/vote/[slug]`

- Category name, full description, banner image
- Nominee grid: photo, full name, department, level, short bio
- Select nominee → confirmation modal → submit vote
- After vote:
  - Confetti micro-animation
  - Card locked, "Vote Cast" state applied
  - Cannot change vote after submission
- If category window is closed: read-only view, no voting UI

---

### 5.5 Admin Panel — `/admin`

#### Categories — `/admin/categories`
- Create category: name, slug, description, banner upload, day number, `opens_at`, `closes_at`
- Toggle controls: `is_visible` (show teaser), `is_open` (voting live), `is_revealed` (results visible)
- Edit, delete, reorder categories

#### Nominees — `/admin/nominees`
- Add nominee to a category: name, photo upload, bio, department, level
- Edit, delete nominees
- Photos stored in Supabase Storage

#### Students — `/admin/students`
- View full student list (imported from CAMS)
- Search by matric number, name, department
- Per student: PIN set status, device bound status, which categories voted
- Actions: Reset PIN (clears device binding + PIN, logs action with admin ID)

#### Results — `/admin/results`
- Live vote counts per category per nominee
- Organic votes and override votes displayed separately
- Combined total shown
- Export as CSV
- **Completely hidden from all public routes**

#### Override Panel — `/admin/overrides` *(Superadmin only)*
- Select category → see all nominees with current vote counts
- Select nominee → choose action: **Add / Remove / Transfer**
- Enter vote delta amount
- Type reason (required field — cannot submit blank)
- Re-enter superadmin password to confirm
- Full override history table with: who, what, when, why
- Override votes stored separately from organic votes in DB

---

### 5.6 Display Mode — `/display`

Fullscreen route. Designed for projector or TV output. No scrollbars, no navigation.

**Screens per category (admin-advanced manually):**

| Screen | Content |
|---|---|
| **1. Category Intro** | Full-screen banner, category name, description, "Voting Closed" badge |
| **2. Nominee Parade** | Each nominee slides in cinematically — photo, name, department, level |
| **3. Drumroll** | Animated suspense screen — ticking/spinning animation |
| **4. Winner Reveal** | Winner photo fills screen, name, category title, confetti, total vote count |
| **5. Leaderboard** | All nominees ranked with animated progress bars, vote counts, percentages |

**Display Controller — `/display/controller`**
- Admin opens this on their phone or laptop
- Buttons: **← Previous** | **Current State** | **Next →** | Jump to Category
- Syncs to display screen via **Supabase Realtime** (WebSocket)
- Admin button press updates `display_state` row in DB; display page listens and reacts instantly

---

## 6. Database Schema

```sql
-- Whitelisted students, imported from CAMS CSV export
students (
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
  locked_until          TIMESTAMP,
  session_token         VARCHAR,
  session_expires       TIMESTAMP,
  last_login_at         TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- One row per device that has initialized an account
device_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint    VARCHAR UNIQUE NOT NULL,
  initialized_for       UUID REFERENCES students(id),
  initialized_at        TIMESTAMP DEFAULT NOW()
)

-- Award categories with drip scheduling
categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR NOT NULL,
  slug                  VARCHAR UNIQUE NOT NULL,
  description           TEXT NOT NULL,
  banner_url            VARCHAR,
  day_number            INT,
  opens_at              TIMESTAMP,
  closes_at             TIMESTAMP,
  is_visible            BOOLEAN DEFAULT false,
  is_open               BOOLEAN DEFAULT false,
  is_revealed           BOOLEAN DEFAULT false,
  display_order         INT,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Nominees per category
nominees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id           UUID REFERENCES categories(id) ON DELETE CASCADE,
  full_name             VARCHAR NOT NULL,
  photo_url             VARCHAR NOT NULL,
  bio                   TEXT,
  department            VARCHAR,
  level                 VARCHAR,
  override_votes        INT DEFAULT 0,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Core vote table — unique constraint is the integrity lock
votes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES students(id),
  nominee_id            UUID REFERENCES nominees(id),
  category_id           UUID REFERENCES categories(id),
  voted_at              TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, category_id)
)

-- Admin and superadmin accounts
admins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR UNIQUE NOT NULL,
  password_hash         VARCHAR NOT NULL,
  role                  VARCHAR DEFAULT 'admin', -- 'admin' | 'superadmin'
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Superadmin vote overrides — fully audited
vote_overrides (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id         UUID REFERENCES admins(id),
  nominee_id            UUID REFERENCES nominees(id),
  category_id           UUID REFERENCES categories(id),
  action                VARCHAR NOT NULL,        -- 'add' | 'remove' | 'transfer'
  votes_delta           INT NOT NULL,
  reason                TEXT NOT NULL,
  performed_at          TIMESTAMP DEFAULT NOW()
)

-- Audit log for every PIN reset
pin_reset_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES students(id),
  reset_by              VARCHAR NOT NULL,        -- 'admin:{admin_id}'
  reset_at              TIMESTAMP DEFAULT NOW()
)

-- Single-row state table for display mode sync (Supabase Realtime)
display_state (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_category_id   UUID REFERENCES categories(id),
  current_screen        VARCHAR DEFAULT 'intro', -- 'intro'|'parade'|'drumroll'|'reveal'|'leaderboard'
  updated_at            TIMESTAMP DEFAULT NOW()
)
```

**Vote tally formula:**
```
Total votes for nominee =
  COUNT(votes WHERE nominee_id = x) + nominees.override_votes
```

Organic and override votes are always stored separately. Combined total is computed at query time.

---

## 7. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one codebase, no separate backend |
| Database | Supabase (PostgreSQL) | Free tier, Realtime, Storage — all in one |
| Realtime | Supabase Realtime | WebSocket sync for display controller |
| File Storage | Supabase Storage | Nominee photos, category banners (free 1GB) |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Animations | Framer Motion | Cinematic transitions, reveal animations |
| Auth | Custom (matric + PIN + device fingerprint) | CAMS-compatible, no email/OTP dependency |
| Deployment | Vercel | Free tier, auto CI/CD from GitHub |
| Student Import | One-time Node.js script | CAMS CSV → Supabase students table |

---

## 8. Application Routes

```
/                          Landing page — event info, countdown
/login                     Student auth — matric + PIN
/vote                      Category browser (drip-aware)
/vote/[slug]               Category detail + nominee cards + vote submission
/display                   Projector/TV fullscreen mode
/display/controller        Admin remote control for display
/admin                     Admin dashboard
/admin/categories          Create, schedule, toggle categories
/admin/nominees            Add nominees, upload photos
/admin/students            View student list, reset PINs
/admin/results             Live results (hidden from public)
/admin/overrides           Superadmin-only vote override panel
```

---

## 9. Build Phases

### Phase 1 — Foundation
- Supabase project setup
- Full schema creation with RLS policies
- Storage buckets (nominee photos, category banners)
- Student import script: CAMS CSV → `students` table

### Phase 2 — Authentication
- Device fingerprinting (client-side, silent)
- PIN setup flow with device binding
- Returning login with lockout logic
- Session management (httpOnly cookie, JWT)
- Admin auth (email + password)
- Route middleware (student-protected, admin-protected, superadmin-protected)

### Phase 3 — Public Voting UI
- Landing page with countdown
- Category browser with drip-aware card states
- Category detail page with nominee grid
- Vote submission with confirmation modal
- Post-vote confetti animation and locked state

### Phase 4 — Admin Panel
- Category CRUD with scheduling controls
- Nominee management with photo upload
- Student list with PIN reset
- Live results view (admin-only)

### Phase 5 — Display Mode
- Projector UI (all 5 screens per category)
- Controller panel
- Supabase Realtime sync between controller and display
- Cinematic animations per screen

### Phase 6 — Superadmin Override
- Override panel with nominee vote adjustment
- Password re-confirmation on every action
- Full audit log view
- Combined tally logic (organic + override)

### Phase 7 — Polish
- VUSRC branding and logo integration
- Full dark cinematic design pass
- Mobile responsiveness audit
- Edge case handling and error states
- Load and performance testing

---

## 10. Open Items

| Item | Status | Blocking? |
|---|---|---|
| VUSRC logo asset | Pending — placeholder used until provided | No |
| Award category names and nominees | Pending — admin enters via panel during setup | No |
| Student week exact dates | Pending — needed to set `opens_at` / `closes_at` per category | No |
| CAMS CSV export — confirm exact column names | Required before writing import script | Phase 1 |
| Display mode audio (drumroll screen) | Optional — decide before Phase 5 | No |
| VUSRC brand colors (beyond dark + gold) | Confirm before Phase 7 design pass | No |

---

*VUSRC Awards Platform PRD v1.0 — Planning complete. Ready for Phase 1 Claude Code prompt.*
