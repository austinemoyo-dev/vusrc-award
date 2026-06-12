import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

async function getOrCreateState(supabase: ReturnType<typeof createServiceClient>) {
  let { data } = await supabase
    .from('display_state')
    .select('id, registration_open')
    .limit(1)
    .maybeSingle()

  if (!data) {
    const { data: created } = await supabase
      .from('display_state')
      .insert({ current_category_id: null, current_screen: 'intro' })
      .select('id, registration_open')
      .single()
    data = created
  }

  return data
}

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()
  const state = await getOrCreateState(supabase)
  if (!state) {
    return Response.json({ error: 'Failed to load registration state', code: 'db_error' }, { status: 500 })
  }

  return Response.json({ open: state.registration_open ?? true })
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  if (body.action !== 'open' && body.action !== 'close') {
    return Response.json({ error: "action must be 'open' or 'close'", code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const state = await getOrCreateState(supabase)
  if (!state) {
    return Response.json({ error: 'Failed to load registration state', code: 'db_error' }, { status: 500 })
  }

  const opening = body.action === 'open'

  const { error } = await supabase
    .from('display_state')
    .update({ registration_open: opening, updated_at: new Date().toISOString() })
    .eq('id', state.id as string)

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  return Response.json({ success: true, open: opening })
}
