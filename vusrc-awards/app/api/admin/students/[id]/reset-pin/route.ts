import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { session, errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params
  const supabase = createServiceClient()

  // Verify student exists
  const { data: student } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('id', id)
    .maybeSingle()

  if (!student) {
    return Response.json({ error: 'Student not found', code: 'not_found' }, { status: 404 })
  }

  // Clear PIN, device binding, and lockout state
  const { error: updateErr } = await supabase
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
    .eq('id', id)

  if (updateErr) {
    return Response.json({ error: updateErr.message, code: 'db_error' }, { status: 500 })
  }

  // Free up the device so the student can re-register on the same device
  await supabase.from('device_registry').delete().eq('initialized_for', id)

  // Log the reset action
  await supabase.from('pin_reset_log').insert({
    student_id: id,
    reset_by: session.adminId,
    reset_at: new Date().toISOString(),
  })

  return Response.json({ success: true })
}
