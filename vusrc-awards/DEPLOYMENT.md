# Deploying VUSRC Awards

This app is a Next.js 16 (App Router) project backed by Supabase. The
recommended host is **Vercel** (zero-config for Next.js), with Supabase
as the managed Postgres + storage + realtime backend.

---

## 1. Supabase setup

If you're using a fresh Supabase project (skip if you already have one running):

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the three files in `supabase/` **in this order**:
   - `schema.sql` — tables
   - `rls.sql` — row-level security policies
   - `storage.sql` — storage buckets (`nominee-photos`, `category-banners`)
3. **Enable Realtime** for the display screen:
   - Go to **Database → Replication**
   - Add the `display_state` table to the `supabase_realtime` publication
   - (If you skip this, the TV display still works via a 3-second polling fallback)
4. Grab your project credentials from **Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret — server-only)

---

## 2. Environment variables

Create these in Vercel → Project → Settings → Environment Variables
(or `.env.local` for local dev). Never commit `.env.local`.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key — **server only**, never expose |
| `JWT_SECRET` | ✅ | Random long string used to sign student/admin session tokens. Generate with `openssl rand -base64 48` |
| `NEXT_PUBLIC_VOTING_OPENS` | ✅ | ISO timestamp (e.g. `2026-06-15T08:00:00Z`) — controls the "voting opens" countdown |
| `NEXT_PUBLIC_DISPLAY_CONTROLLER_CODE` | ✅ | Access code for `/display/controller` (client-side gate) |
| `DISPLAY_CONTROLLER_CODE` | ✅ | Same value as above — checked server-side. **Must match exactly.** |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL of the deployed site (e.g. `https://awards.visionuniversity.edu.ng`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | Web push public key (only needed for push notifications) |
| `VAPID_PRIVATE_KEY` | optional | Web push private key |
| `VAPID_EMAIL` | optional | Contact email for push (e.g. `mailto:admin@example.com`) |

To generate VAPID keys (only if you want push notifications):

```bash
npx web-push generate-vapid-keys
```

---

## 3. Deploy to Vercel

### Option A — via Git (recommended)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Next.js — no build config needed.
4. Add all environment variables from the table above (Production + Preview).
5. Deploy.

### Option B — via CLI

```bash
npm i -g vercel
vercel login
vercel          # first deploy, links the project
vercel --prod   # deploy to production
```

You'll be prompted to add env vars, or set them ahead of time:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add NEXT_PUBLIC_VOTING_OPENS production
vercel env add NEXT_PUBLIC_DISPLAY_CONTROLLER_CODE production
vercel env add DISPLAY_CONTROLLER_CODE production
vercel env add NEXT_PUBLIC_SITE_URL production
```

---

## 4. Post-deploy checklist

1. **Create your superadmin account** (run locally, pointed at production `.env.local`):
   ```bash
   node scripts/create-admin.mjs you@example.com "StrongPassword123" superadmin
   ```
2. Visit `/admin/login` and sign in.
3. Add real **categories** (`/admin/categories`), including bulk upload via CSV.
4. Add **nominees** with photos for each category (`/admin/nominees`).
5. Bulk import the real **student list** (`/admin/students`) — matric numbers + phone numbers.
6. Set `is_visible` / `is_open` on categories when you want voting to start.
7. Open `/display` on the venue screen/projector, and `/display/controller`
   on the operator's device (use the access code from env vars).
8. Confirm `NEXT_PUBLIC_VOTING_OPENS` matches your event start time — the
   public landing page countdown reads this.

---

## 5. Domain & SSL

- In Vercel, go to **Project → Settings → Domains** and add your custom domain
  (e.g. `awards.visionuniversity.edu.ng`).
- Update your DNS with the records Vercel provides (usually a CNAME or A record).
- SSL certificates are issued automatically.
- Update `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.

---

## 6. Resetting before a new event

To wipe all students/categories/nominees/votes (keeping admin accounts) before
re-using the platform for a future event:

```bash
node scripts/reset-for-launch.mjs --confirm
```

This also clears uploaded images from Supabase Storage and resets the
display to standby.
