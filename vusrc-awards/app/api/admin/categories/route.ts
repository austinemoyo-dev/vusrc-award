import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()

  const [categoriesRes, nomineesRes] = await Promise.all([
    supabase.from('categories').select('*').order('display_order', { ascending: true }),
    supabase.from('nominees').select('category_id'),
  ])

  const categories = categoriesRes.data ?? []
  const countMap: Record<string, number> = {}
  for (const n of nomineesRes.data ?? []) {
    const id = n.category_id as string
    countMap[id] = (countMap[id] ?? 0) + 1
  }

  const result = categories.map((c) => ({
    ...c,
    nomineeCount: countMap[c.id as string] ?? 0,
  }))

  return Response.json(result)
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

  const { name, slug, description, day_number, opens_at, closes_at, display_order, banner_url } = body

  if (!name || typeof name !== 'string') {
    return Response.json({ error: 'name is required', code: 'bad_request' }, { status: 400 })
  }
  if (!slug || typeof slug !== 'string') {
    return Response.json({ error: 'slug is required', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Ensure slug is unique
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return Response.json({ error: 'slug already exists', code: 'conflict' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      description: description ?? '',
      day_number: day_number ?? null,
      opens_at: opens_at ?? null,
      closes_at: closes_at ?? null,
      display_order: display_order ?? 0,
      banner_url: banner_url ?? null,
      is_visible: false,
      is_open: false,
      is_revealed: false,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
