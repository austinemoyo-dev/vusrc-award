import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyNomineeAdded } from '@/lib/push/send'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()

  const [nomineesRes, categoriesRes, votesRes] = await Promise.all([
    supabase.from('nominees').select('*').order('full_name', { ascending: true }),
    supabase.from('categories').select('id, name, slug, display_order').order('display_order'),
    supabase.from('votes').select('nominee_id'),
  ])

  const voteCountMap: Record<string, number> = {}
  for (const v of votesRes.data ?? []) {
    const nid = v.nominee_id as string
    voteCountMap[nid] = (voteCountMap[nid] ?? 0) + 1
  }

  const nominees = (nomineesRes.data ?? []).map((n) => ({
    ...n,
    organic_votes: voteCountMap[n.id as string] ?? 0,
  }))

  return Response.json({ nominees, categories: categoriesRes.data ?? [] })
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  const { full_name, category_id, photo_url, bio, department, level } = body

  if (!full_name || typeof full_name !== 'string') {
    return Response.json({ error: 'full_name is required', code: 'bad_request' }, { status: 400 })
  }
  if (!category_id || typeof category_id !== 'string') {
    return Response.json({ error: 'category_id is required', code: 'bad_request' }, { status: 400 })
  }
  if (!photo_url || typeof photo_url !== 'string') {
    return Response.json({ error: 'photo_url is required', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('nominees')
    .insert({
      full_name,
      category_id,
      photo_url,
      bio: bio ?? null,
      department: department ?? null,
      level: level ?? null,
      override_votes: 0,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('id', category_id)
    .maybeSingle()

  if (cat) {
    void notifyNomineeAdded(full_name, cat.name, cat.slug)
  }

  return Response.json(data, { status: 201 })
}
