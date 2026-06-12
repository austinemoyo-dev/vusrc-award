import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()

  const [studentsRes, votes] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, matric_number, full_name, department, level, phone_number, pin_set, initializer_device, last_login_at, failed_attempts, locked_until, created_at'
      )
      .order('full_name', { ascending: true }),
    fetchAllRows((from, to) =>
      supabase.from('votes').select('student_id').range(from, to)
    ),
  ])

  const voteCountMap: Record<string, number> = {}
  for (const v of votes) {
    const sid = v.student_id as string
    voteCountMap[sid] = (voteCountMap[sid] ?? 0) + 1
  }

  const students = (studentsRes.data ?? []).map((s) => ({
    ...s,
    device_bound: (s.initializer_device as string | null) !== null,
    vote_count: voteCountMap[s.id as string] ?? 0,
  }))

  return Response.json(students)
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: { matric_number?: string; full_name?: string; department?: string; level?: string; phone_number?: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }) }

  const matric = body.matric_number?.trim().toUpperCase()
  const name   = body.full_name?.trim()
  if (!matric) return Response.json({ error: 'matric_number is required' }, { status: 400 })
  if (!name)   return Response.json({ error: 'full_name is required' }, { status: 400 })

  const supabase = createServiceClient()

  // Check for duplicate matric
  const { data: existing } = await supabase.from('students').select('id').eq('matric_number', matric).maybeSingle()
  if (existing) return Response.json({ error: `Matric number ${matric} already exists` }, { status: 409 })

  // Check for duplicate phone if provided
  const phone = body.phone_number?.trim() || null
  if (phone) {
    const { data: existingPhone } = await supabase.from('students').select('id').eq('phone_number', phone).maybeSingle()
    if (existingPhone) return Response.json({ error: `Phone number ${phone} already registered` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      matric_number: matric,
      full_name: name,
      department: body.department?.trim() || null,
      level: body.level?.trim() || null,
      phone_number: phone,
      pin_set: false,
      failed_attempts: 0,
      initializer_locked: false,
    })
    .select('id, matric_number, full_name, department, level, phone_number, pin_set, last_login_at, failed_attempts, locked_until, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ...data, device_bound: false, vote_count: 0 }, { status: 201 })
}
