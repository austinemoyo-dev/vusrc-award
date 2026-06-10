/**
 * Seed demo students for testing.
 * All demo accounts are created with PIN 1234.
 *
 * Usage:
 *   node scripts/seed-demo-students.mjs
 *
 * Safe to re-run — skips students that already exist (upsert on matric_number).
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const bcrypt  = require('bcryptjs')
const __dir   = dirname(fileURLToPath(import.meta.url))

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(__dir, '../.env.local')
let envText = ''
try { envText = readFileSync(envPath, 'utf-8') } catch { /* no .env.local */ }

const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabaseUrl  = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const serviceKey   = env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

// ── Demo students ────────────────────────────────────────────────────────────
const DEMO_PIN  = '1234'
const pinHash   = await bcrypt.hash(DEMO_PIN, 12)

const demoStudents = [
  { matric_number: 'DEMO/001', full_name: 'John Adeyemi',         department: 'Computer Science & Engineering', level: '200L', phone_number: '08011111001' },
  { matric_number: 'DEMO/002', full_name: 'Amara Okafor',         department: 'Business Administration',       level: '300L', phone_number: '08011111002' },
  { matric_number: 'DEMO/003', full_name: 'Tunde Balogun',        department: 'Law',                           level: '400L', phone_number: '08011111003' },
  { matric_number: 'DEMO/004', full_name: 'Ngozi Eze',            department: 'Medicine',                      level: '100L', phone_number: '08011111004' },
  { matric_number: 'DEMO/005', full_name: 'Emeka Nwosu',          department: 'Engineering',                   level: '200L', phone_number: '08011111005' },
  { matric_number: 'DEMO/006', full_name: 'Fatima Al-Hassan',     department: 'Mass Communication',            level: '300L', phone_number: '08011111006' },
  { matric_number: 'DEMO/007', full_name: 'Chidinma Okonkwo',     department: 'Nursing',                       level: '400L', phone_number: '08011111007' },
  { matric_number: 'DEMO/008', full_name: 'Samuel Osei',          department: 'Biochemistry',                  level: '200L', phone_number: '08011111008' },
]

const rows = demoStudents.map(s => ({
  ...s,
  pin_hash: pinHash,
  pin_set:  true,
}))

// ── Upsert ───────────────────────────────────────────────────────────────────
const res = await fetch(`${supabaseUrl}/rest/v1/students`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey:         serviceKey,
    Authorization:  `Bearer ${serviceKey}`,
    Prefer:         'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
})

if (!res.ok) {
  const body = await res.text()
  console.error(`Supabase error (${res.status}): ${body}`)
  process.exit(1)
}

console.log(`\nSeeded ${rows.length} demo students. PIN for all accounts: ${DEMO_PIN}\n`)
console.log('You can log in with matric number OR phone number:\n')
rows.forEach(s => {
  console.log(`  ${s.matric_number.padEnd(12)} | ${s.full_name.padEnd(24)} | ${s.phone_number}`)
})
console.log()
