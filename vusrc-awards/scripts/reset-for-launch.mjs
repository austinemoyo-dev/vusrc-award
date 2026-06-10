/**
 * Full reset before going live.
 * Wipes: students, categories, nominees, votes, vote_overrides,
 *        device_registry, storage (nominee-photos, category-banners),
 *        and resets display_state to standby.
 * Keeps: admins.
 *
 * Usage:
 *   node scripts/reset-for-launch.mjs --confirm
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

if (!process.argv.includes('--confirm')) {
  console.error('This will permanently delete ALL students, categories, nominees, votes,')
  console.error('overrides, and uploaded images. Admin accounts are kept.')
  console.error('\nRe-run with --confirm to proceed:')
  console.error('  node scripts/reset-for-launch.mjs --confirm')
  process.exit(1)
}

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#') && l.trim())
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const baseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!baseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

async function deleteAll(table) {
  const res = await fetch(`${baseUrl}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact' },
  })
  const count = res.headers.get('content-range')?.split('/')[1] ?? '?'
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to clear ${table}: ${res.status} ${body}`)
  }
  console.log(`  ✓ ${table}: ${count} row(s) deleted`)
}

async function emptyBucket(bucket) {
  const listRes = await fetch(`${baseUrl}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 1000, prefix: '' }),
  })
  if (!listRes.ok) {
    console.log(`  ⚠ ${bucket}: could not list (${listRes.status}), skipping`)
    return
  }
  const files = await listRes.json()
  const names = (files ?? []).map(f => f.name).filter(Boolean)
  if (names.length === 0) {
    console.log(`  ✓ ${bucket}: already empty`)
    return
  }
  const delRes = await fetch(`${baseUrl}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: names }),
  })
  if (!delRes.ok) {
    const body = await delRes.text()
    throw new Error(`Failed to clear bucket ${bucket}: ${delRes.status} ${body}`)
  }
  console.log(`  ✓ ${bucket}: ${names.length} file(s) deleted`)
}

console.log('Resetting database for launch…\n')

console.log('Database tables:')
// Order matters for clarity, but FK CASCADE handles dependents either way.
await deleteAll('vote_overrides')
await deleteAll('votes')
await deleteAll('nominees')
await deleteAll('categories')
await deleteAll('device_registry')
await deleteAll('pin_reset_log')
await deleteAll('students')

console.log('\nStorage buckets:')
await emptyBucket('nominee-photos')
await emptyBucket('category-banners')

console.log('\nDisplay state:')
const displayRes = await fetch(`${baseUrl}/rest/v1/display_state?id=not.is.null`, {
  method: 'PATCH',
  headers: {
    apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json', Prefer: 'return=minimal',
  },
  body: JSON.stringify({ current_category_id: null, current_screen: 'intro' }),
})
if (!displayRes.ok) {
  const body = await displayRes.text()
  throw new Error(`Failed to reset display_state: ${displayRes.status} ${body}`)
}
console.log('  ✓ display_state reset to standby (intro screen, no active category)')

console.log('\nDone. Admin accounts were left untouched.')
console.log('Next steps: add real categories, nominees, and import the real student list.')
