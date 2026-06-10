import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Run: npx ts-node scripts/import-students.ts --file scripts/data/students.csv
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const fileArgIdx = args.indexOf('--file')
if (fileArgIdx === -1 || !args[fileArgIdx + 1]) {
  console.error('Usage: npx ts-node scripts/import-students.ts --file <path-to-csv>')
  process.exit(1)
}

const csvPath = path.resolve(args[fileArgIdx + 1])
if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

interface CsvRow {
  matric_number?: string
  full_name?: string
  department?: string
  level?: string
  phone_number?: string
  [key: string]: string | undefined
}

async function main() {
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const { data, errors } = Papa.parse<CsvRow>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (errors.length > 0) {
    console.error('CSV parse errors:', errors)
    process.exit(1)
  }

  let inserted = 0
  let updated = 0
  let skipped = 0
  const skipReasons: string[] = []

  console.log(`\nProcessing ${data.length} rows from ${csvPath}...\n`)

  for (const row of data) {
    const matric = row.matric_number?.trim()
    const name = row.full_name?.trim()

    if (!matric || !name) {
      skipped++
      skipReasons.push(`Skipped row — missing matric_number or full_name: ${JSON.stringify(row)}`)
      continue
    }

    const payload = {
      matric_number: matric,
      full_name: name,
      department: row.department?.trim() || null,
      level: row.level?.trim() || null,
      phone_number: row.phone_number?.trim() || null,
    }

    // Check if student already exists
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('matric_number', matric)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: payload.full_name,
          department: payload.department,
          level: payload.level,
          phone_number: payload.phone_number,
        })
        .eq('matric_number', matric)

      if (error) {
        skipped++
        skipReasons.push(`Update failed for ${matric}: ${error.message}`)
      } else {
        updated++
      }
    } else {
      const { error } = await supabase.from('students').insert(payload)

      if (error) {
        skipped++
        skipReasons.push(`Insert failed for ${matric}: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  console.log('--- Import Summary ---')
  console.log(`Total rows:  ${data.length}`)
  console.log(`Inserted:    ${inserted}`)
  console.log(`Updated:     ${updated}`)
  console.log(`Skipped:     ${skipped}`)

  if (skipReasons.length > 0) {
    console.log('\nSkip reasons:')
    skipReasons.forEach((r) => console.log(' •', r))
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
