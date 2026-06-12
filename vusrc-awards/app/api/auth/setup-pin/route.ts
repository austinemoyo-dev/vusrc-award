import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { signStudentToken } from '@/lib/auth/jwt'
import { setStudentSession } from '@/lib/auth/session'

const PIN_REGEX = /^\d{4}$/

export async function POST(request: NextRequest) {
  let body: { matricNumber?: string; pin?: string; deviceFingerprint?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const matric = body.matricNumber?.trim().toUpperCase()
  const pin = body.pin
  const fingerprint = body.deviceFingerprint?.trim()

  if (!matric || !pin || !fingerprint) {
    return Response.json({ error: 'matricNumber, pin, and deviceFingerprint are required.' }, { status: 400 })
  }

  if (!PIN_REGEX.test(pin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check device registry — one device per account initialization
  const { data: existingDevice } = await supabase
    .from('device_registry')
    .select('id')
    .eq('device_fingerprint', fingerprint)
    .maybeSingle()

  if (existingDevice) {
    return Response.json(
      { error: 'This device has already been used to set up an account.' },
      { status: 403 }
    )
  }

  // Load student
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, full_name, pin_set')
    .eq('matric_number', matric)
    .maybeSingle()

  if (studentErr || !student) {
    return Response.json({ error: 'Matric number not found.' }, { status: 404 })
  }

  if (student.pin_set) {
    return Response.json({ error: 'Account already initialized.' }, { status: 400 })
  }

  const pinHash = await bcrypt.hash(pin, 12)

  // Update student record
  const { error: updateErr } = await supabase
    .from('students')
    .update({
      pin_hash: pinHash,
      pin_set: true,
      initializer_device: fingerprint,
      initializer_locked: true,
    })
    .eq('id', student.id)

  if (updateErr) {
    return Response.json({ error: 'Failed to initialize account.' }, { status: 500 })
  }

  // Register device
  await supabase.from('device_registry').insert({
    device_fingerprint: fingerprint,
    initialized_for: student.id,
  })

  const token = await signStudentToken(student.id, matric)
  await setStudentSession(token)

  return Response.json({ success: true })
}
