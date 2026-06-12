import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyCategoryOpened, notifyCategoryClosed, broadcastPush } from '@/lib/push/send'

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
  const opening = body.action === 'open'

  const updates: Record<string, boolean> = { is_open: opening }
  if (opening) updates.is_visible = true

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .not('id', 'is', null)
    .select('id, name, slug')

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  const categories = data ?? []
  if (categories.length === 1) {
    const cat = categories[0]!
    if (opening) {
      notifyCategoryOpened(cat.name as string, cat.slug as string).catch(() => {})
    } else {
      notifyCategoryClosed(cat.name as string).catch(() => {})
    }
  } else if (categories.length > 1) {
    broadcastPush({
      title: opening ? 'Voting is now open!' : 'Voting has closed',
      body:  opening
        ? 'All categories are now open — cast your votes!'
        : 'Voting has closed for all categories. Check back for results.',
      url:   '/vote',
      tag:   `voting-${opening ? 'open' : 'closed'}-all`,
    }).catch(() => {})
  }

  return Response.json({ success: true, count: categories.length })
}
