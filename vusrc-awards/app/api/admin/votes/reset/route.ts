import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin('superadmin')
  if (errorResponse) return errorResponse

  let body: { confirm?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  if (body.confirm !== 'RESET VOTES') {
    return Response.json({ error: 'Confirmation phrase did not match.', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Hide previously revealed results (vote counts are about to become invalid)
  const { error: catErr } = await supabase
    .from('categories')
    .update({ is_revealed: false })
    .not('id', 'is', null)

  if (catErr) {
    return Response.json({ error: catErr.message, code: 'db_error' }, { status: 500 })
  }

  // Wipe all cast votes
  const { error: votesErr } = await supabase
    .from('votes')
    .delete()
    .not('id', 'is', null)

  if (votesErr) {
    return Response.json({ error: votesErr.message, code: 'db_error' }, { status: 500 })
  }

  // Clear manual vote overrides
  const { error: nomineesErr } = await supabase
    .from('nominees')
    .update({ override_votes: 0 })
    .not('id', 'is', null)

  if (nomineesErr) {
    return Response.json({ error: nomineesErr.message, code: 'db_error' }, { status: 500 })
  }

  return Response.json({ success: true })
}
