import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { signStudentToken } from '@/lib/auth/jwt'
import { setStudentSession } from '@/lib/auth/session'

const LOCK_THRESHOLD = 5
const LOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(request: NextRequest) {
  let body: { matricNumber?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const matric = body.matricNumber?.trim().toUpperCase()
  const pin = body.pin

  if (!matric || !pin) {
    return Response.json({ error: 'matricNumber and pin are required.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, pin_hash, pin_set, failed_attempts, locked_until')
    .eq('matric_number', matric)
    .maybeSingle()

  if (studentErr || !student) {
    // Intentionally vague — do not reveal whether matric exists at login
    return Response.json({ error: 'incorrect_pin', attemptsLeft: null }, { status: 401 })
  }

  if (!student.pin_set || !student.pin_hash) {
    return Response.json(
      { error: 'Account not initialized. Please set up your PIN first.' },
      { status: 400 }
    )
  }

  // Check lockout
  if (student.locked_until) {
    const unlockAt = new Date(student.locked_until)
    if (unlockAt > new Date()) {
      return Response.json({ error: 'account_locked', unlockAt: unlockAt.toISOString() }, { status: 429 })
    }
  }

  const pinMatch = await bcrypt.compare(pin, student.pin_hash)

  if (pinMatch) {
    await supabase
      .from('students')
      .update({ failed_attempts: 0, last_login_at: new Date().toISOString() })
      .eq('id', student.id)

    const token = await signStudentToken(student.id, matric)
    await setStudentSession(token)

    return Response.json({ success: true })
  }

  // Wrong PIN
  const newFailedAttempts = (student.failed_attempts ?? 0) + 1
  const willLock = newFailedAttempts >= LOCK_THRESHOLD

  await supabase
    .from('students')
    .update({
      failed_attempts: willLock ? 0 : newFailedAttempts,
      locked_until: willLock
        ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
        : null,
    })
    .eq('id', student.id)

  if (willLock) {
    const unlockAt = new Date(Date.now() + LOCK_DURATION_MS)
    return Response.json({ error: 'account_locked', unlockAt: unlockAt.toISOString() }, { status: 429 })
  }

  return Response.json(
    { error: 'incorrect_pin', attemptsLeft: LOCK_THRESHOLD - newFailedAttempts },
    { status: 401 }
  )
}
