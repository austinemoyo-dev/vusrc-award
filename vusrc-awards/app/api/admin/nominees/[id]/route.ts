import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  const allowed = ['full_name', 'bio', 'department', 'level', 'photo_url', 'override_votes', 'category_id']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('nominees')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  return Response.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params
  const supabase = createServiceClient()

  const { count } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('nominee_id', id)

  if (count && count > 0) {
    return Response.json(
      { error: 'Cannot delete nominee with existing votes', code: 'has_votes' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('nominees').delete().eq('id', id)
  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
