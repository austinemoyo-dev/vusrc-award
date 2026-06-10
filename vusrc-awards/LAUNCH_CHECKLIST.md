# VUSRC Awards — Pre-Launch Checklist

Work through this list top-to-bottom before going live. Every item must be checked.

---

## 1. Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — set to your Supabase project URL (ends with `.supabase.co`, NOT `/rest/v1/`)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (keep secret, server-only)
- [ ] `JWT_SECRET` — strong random string, minimum 32 chars (run: `openssl rand -hex 32`)
- [ ] `NEXT_PUBLIC_VOTING_OPENS` — ISO 8601 datetime when voting opens, e.g. `2025-07-01T08:00:00+01:00`
- [ ] `NEXT_PUBLIC_DISPLAY_CONTROLLER_CODE` — access code for the event display controller (change from default!)
- [ ] `DISPLAY_CONTROLLER_CODE` — same value as above (server-side check)
- [ ] `NEXT_PUBLIC_SITE_URL` — your production URL (e.g. `https://vusrc-awards.vercel.app`)

## 2. Database (Supabase)

- [ ] Run the full `supabase/schema.sql` on the production Supabase project
- [ ] Confirm `vote_overrides` table has `transfer_to_nominee_id UUID REFERENCES nominees(id) ON DELETE SET NULL` column
- [ ] `nominee_vote_totals` view is present
- [ ] `execute_override_transfer` stored procedure is present
- [ ] `display_state` table has exactly one row (run: `INSERT INTO display_state DEFAULT VALUES` if empty)
- [ ] RLS is enabled on all tables — confirm no public write access to `votes`, `students`, `admins`
- [ ] `public_read_display_state` RLS policy exists (required for Realtime on the display screen)

## 3. Student Data

- [ ] Student CSV imported into `students` table (matric numbers, full names, department, level)
- [ ] Spot-check 5–10 rows to confirm data is correct
- [ ] Confirm no duplicate matric numbers

## 4. Categories & Nominees

- [ ] All award categories created with correct names and descriptions
- [ ] All nominees added with photos, department, level, bio
- [ ] Nominee photos are accessible (valid `photo_url` values — either public Supabase Storage or CDN)
- [ ] Category banner images uploaded (optional but recommended for display screens)
- [ ] Spot-check voting page on mobile — all nominees display correctly

## 5. Admin Accounts

- [ ] Superadmin account created: `node scripts/create-admin.mjs <email> <password> superadmin`
- [ ] Regular admin account(s) created: `node scripts/create-admin.mjs <email> <password> admin`
- [ ] Test login for each account at `/admin/login`
- [ ] Confirm superadmin can access `/admin/overrides`
- [ ] Confirm regular admin CANNOT access `/admin/overrides` (should redirect)

## 6. Voting Flow (Student-facing)

- [ ] Navigate to `/login` on a real mobile device (iOS Safari + Android Chrome)
- [ ] No zoom on matric number input (font ≥ 16px — already fixed in code)
- [ ] PIN setup flow works end-to-end
- [ ] PIN login flow works end-to-end
- [ ] Voting page shows all categories
- [ ] Submitting a vote records correctly in `votes` table
- [ ] Duplicate vote is rejected (try voting twice for the same category)
- [ ] Countdown timer shows correct time before `NEXT_PUBLIC_VOTING_OPENS`
- [ ] "Already voted" notice shows if student tries to access `/vote` after voting

## 7. Admin Panel

- [ ] Results page (`/admin/results`) shows live vote counts
- [ ] CSV export works
- [ ] Overrides panel: all 4 steps work (add, remove, transfer)
- [ ] Override audit log records each action
- [ ] Override votes appear as part of total on results page — NOT shown separately

## 8. Display System (Event Night)

- [ ] Display controller code changed from default in `.env.local`
- [ ] Open `/display` on the projection computer (full-screen browser, hide cursor)
- [ ] Open `/display/controller` on the MC's device, enter code
- [ ] Test: advance through all 5 screens for one category
- [ ] Test: jump to a specific category via the jump panel
- [ ] Test: reveal screen fires confetti correctly
- [ ] Confirm Realtime sync works between controller and display (they should stay in sync)
- [ ] `display_state` has `is_revealed = false` for all categories before event

## 9. Security

- [ ] Remove or rotate the default `DISPLAY_CONTROLLER_CODE` (`change-me-before-event`)
- [ ] `JWT_SECRET` is not the example value from the docs
- [ ] `.env.local` is in `.gitignore` and NOT committed to git
- [ ] No `console.error`/`console.warn` with sensitive data in production logs
- [ ] Supabase API keys are not exposed in client bundles (service role key is server-only ✓)
- [ ] `robots.txt` or `robots` metadata blocks search engine indexing (already set: `index: false`)

## 10. Performance & Mobile

- [ ] Run Lighthouse on `/login` and `/vote` on mobile — aim for 90+ Performance
- [ ] Images have `width`/`height` set (Next.js `<Image>` handles this automatically ✓)
- [ ] Google Fonts loaded with `display=swap` ✓
- [ ] Test on iOS Safari 15+ (most common on campus)
- [ ] Test on Android Chrome
- [ ] Confirm no horizontal overflow / scroll on any page at 375px width

## 11. Final Go/No-Go

- [ ] Voting `opens` datetime is correct and in the right timezone (+01:00 WAT)
- [ ] Announcement made to students with the URL
- [ ] At least 2 people have tested the full voting flow on their own phones
- [ ] Event display computer is charged / plugged in
- [ ] Backup plan: admin can use `/admin/results` to manually tally if display fails

---

**Day-of reminder:** Reset `display_state` to `{ screen: 'intro', category_id: null, is_revealed: false }` before the event starts.

```sql
UPDATE display_state SET screen = 'intro', category_id = NULL, is_revealed = false;
```
