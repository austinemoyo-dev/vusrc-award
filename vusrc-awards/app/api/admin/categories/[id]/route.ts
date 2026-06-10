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

  const supabase = createServiceClient()

  // If slug is being changed, ensure uniqueness
  if (body.slug) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', body.slug as string)
      .neq('id', id)
      .maybeSingle()
    if (existing) {
      return Response.json({ error: 'slug already exists', code: 'conflict' }, { status: 409 })
    }
  }

  const allowed = ['name', 'slug', 'description', 'day_number', 'opens_at', 'closes_at', 'display_order', 'banner_url']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const { data, error } = await supabase
    .from('categories')
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

  // Refuse if any votes exist for this category
  const { count } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return Response.json(
      { error: 'Cannot delete category with existing votes', code: 'has_votes' },
      { status: 409 }
    )
  }

  // Delete nominees first (foreign key constraint)
  await supabase.from('nominees').delete().eq('category_id', id)

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
