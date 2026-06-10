import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

interface BulkStudent {
  matric_number: string
  full_name: string
  department?: string
  level?: string
  phone_number?: string
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: { students: BulkStudent[] }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }) }

  const items = body.students
  if (!Array.isArray(items) || items.length === 0)
    return Response.json({ error: 'students array is required' }, { status: 400 })
  if (items.length > 1000)
    return Response.json({ error: 'Max 1000 students per upload' }, { status: 400 })

  // Validate rows
  const rows: {
    matric_number: string; full_name: string
    department: string | null; level: string | null
    phone_number: string | null
    pin_set: boolean; failed_attempts: number; initializer_locked: boolean
  }[] = []
  const matricSeen = new Set<string>()
  const phoneSeen  = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const matric = item.matric_number?.trim().toUpperCase()
    const name   = item.full_name?.trim()
    if (!matric) return Response.json({ error: `Row ${i + 1}: matric_number is required` }, { status: 400 })
    if (!name)   return Response.json({ error: `Row ${i + 1}: full_name is required` }, { status: 400 })
    if (matricSeen.has(matric)) return Response.json({ error: `Row ${i + 1}: duplicate matric "${matric}"` }, { status: 400 })
    matricSeen.add(matric)

    const phone = item.phone_number?.trim() || null
    if (phone) {
      if (phoneSeen.has(phone)) return Response.json({ error: `Row ${i + 1}: duplicate phone "${phone}"` }, { status: 400 })
      phoneSeen.add(phone)
    }

    rows.push({
      matric_number: matric,
      full_name: name,
      department: item.department?.trim() || null,
      level: item.level?.trim() || null,
      phone_number: phone,
      pin_set: false,
      failed_attempts: 0,
      initializer_locked: false,
    })
  }

  const supabase = createServiceClient()

  // Check for matric conflicts
  const { data: existingMatrics } = await supabase
    .from('students').select('matric_number').in('matric_number', [...matricSeen])
  if (existingMatrics?.length) {
    const list = existingMatrics.map((e) => e.matric_number as string).join(', ')
    return Response.json({ error: `Matric numbers already exist: ${list}` }, { status: 409 })
  }

  // Check for phone conflicts
  const phones = [...phoneSeen]
  if (phones.length > 0) {
    const { data: existingPhones } = await supabase
      .from('students').select('phone_number').in('phone_number', phones)
    if (existingPhones?.length) {
      const list = existingPhones.map((e) => e.phone_number as string).join(', ')
      return Response.json({ error: `Phone numbers already registered: ${list}` }, { status: 409 })
    }
  }

  const { data, error } = await supabase.from('students').insert(rows).select('id, matric_number, full_name, department, level, phone_number, pin_set, created_at')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ created: data?.length ?? 0, students: data }, { status: 201 })
}
