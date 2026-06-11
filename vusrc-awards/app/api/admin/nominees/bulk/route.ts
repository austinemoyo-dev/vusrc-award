import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyNomineeAdded } from '@/lib/push/send'

interface BulkNominee {
  full_name: string
  department?: string | null
  level?: string | null
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: { category_id?: string; nominees?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { category_id, nominees } = body

  if (!category_id || typeof category_id !== 'string') {
    return Response.json({ error: 'category_id is required' }, { status: 400 })
  }
  if (!Array.isArray(nominees) || nominees.length === 0) {
    return Response.json({ error: 'nominees array is required and must not be empty' }, { status: 400 })
  }
  if (nominees.length > 200) {
    return Response.json({ error: 'Maximum 200 nominees per import' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Confirm the category exists
  const { data: cat } = await supabase.from('categories').select('id, name, slug').eq('id', category_id).maybeSingle()
  if (!cat) return Response.json({ error: 'Category not found' }, { status: 404 })

  const rows = (nominees as BulkNominee[]).map((n) => ({
    category_id,
    full_name:      n.full_name.trim(),
    department:     n.department?.trim() || null,
    level:          n.level?.trim() || null,
    photo_url:      '',
    override_votes: 0,
    bio:            null,
  }))

  const { data, error } = await supabase
    .from('nominees')
    .insert(rows)
    .select('id, full_name, department, level, category_id, photo_url, bio, override_votes')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (data.length === 1) {
    void notifyNomineeAdded(data[0].full_name as string, cat.name, cat.slug)
  } else if (data.length > 1) {
    void notifyNomineeAdded(`${data.length} new nominees`, cat.name, cat.slug)
  }

  return Response.json({ created: data.length, nominees: data }, { status: 201 })
}
