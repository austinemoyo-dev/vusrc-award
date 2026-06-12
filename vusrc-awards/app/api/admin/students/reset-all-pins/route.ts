import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireAdmin('superadmin')
  if (errorResponse) return errorResponse

  let body: { confirm?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  if (body.confirm !== 'RESET PINS') {
    return Response.json({ error: 'Confirmation phrase did not match.', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Clear PIN, device binding, and lockout state for every student
  const { data, error: updateErr } = await supabase
    .from('students')
    .update({
      pin_hash: null,
      pin_set: false,
      initializer_device: null,
      initializer_locked: false,
      failed_attempts: 0,
      locked_until: null,
      session_token: null,
      session_expires: null,
    })
    .not('id', 'is', null)
    .select('id')

  if (updateErr) {
    return Response.json({ error: updateErr.message, code: 'db_error' }, { status: 500 })
  }

  // Free up all devices so students can re-register
  await supabase.from('device_registry').delete().not('id', 'is', null)

  // Log the reset action for each student
  const now = new Date().toISOString()
  const logRows = (data ?? []).map((s) => ({
    student_id: s.id as string,
    reset_by: session.adminId,
    reset_at: now,
  }))
  if (logRows.length > 0) {
    await supabase.from('pin_reset_log').insert(logRows)
  }

  return Response.json({ success: true, count: data?.length ?? 0 })
}
