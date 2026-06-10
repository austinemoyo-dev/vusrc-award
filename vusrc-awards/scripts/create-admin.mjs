/**
 * Create an admin or superadmin account.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> [admin|superadmin]
 *
 * Examples:
 *   node scripts/create-admin.mjs admin@vusrc.com Str0ngP@ss superadmin
 *   node scripts/create-admin.mjs helper@vusrc.com Str0ngP@ss admin
 *
 * Run from the project root. Reads credentials from .env.local automatically.
 */

import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Read .env.local ───────────────────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local')
let envContent
try {
  envContent = readFileSync(envPath, 'utf-8')
} catch {
  console.error('Could not read .env.local — run this script from the project root.')
  process.exit(1)
}

const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#') && l.trim())
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

// Strip /rest/v1 suffix if present — we need the bare project URL
const baseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!baseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

// ── CLI args ──────────────────────────────────────────────────────────────────

const [, , email, password, role = 'admin'] = process.argv

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [admin|superadmin]')
  process.exit(1)
}

if (!['admin', 'superadmin'].includes(role)) {
  console.error('Role must be "admin" or "superadmin"')
  process.exit(1)
}

// ── Hash + insert ──────────────────────────────────────────────────────────────

console.log(`Hashing password (bcrypt 12 rounds)…`)
const passwordHash = await bcrypt.hash(password, 12)

console.log(`Inserting ${role} "${email}"…`)

const res = await fetch(`${baseUrl}/rest/v1/admins`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ email, password_hash: passwordHash, role }),
})

if (!res.ok) {
  const err = await res.json().catch(() => res.statusText)
  if (typeof err === 'object' && err.code === '23505') {
    console.error(`An admin with email "${email}" already exists.`)
  } else {
    console.error('Supabase error:', JSON.stringify(err, null, 2))
  }
  process.exit(1)
}

const rows = await res.json()
const created = rows[0]
console.log(`\n✓ ${role === 'superadmin' ? 'Superadmin' : 'Admin'} created successfully`)
console.log(`  ID:    ${created.id}`)
console.log(`  Email: ${created.email}`)
console.log(`  Role:  ${created.role}`)
console.log(`\nLogin at /admin/login with the credentials you just set.`)
