import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

function toSlug(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface BulkCategory {
  name: string
  description?: string
  day_number?: number | null
  display_order?: number
  slug?: string
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: { categories: BulkCategory[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const items = body.categories
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'categories array is required' }, { status: 400 })
  }
  if (items.length > 100) {
    return Response.json({ error: 'Max 100 categories per upload' }, { status: 400 })
  }

  // Validate and build rows
  const rows: {
    name: string; slug: string; description: string
    day_number: number | null; display_order: number
    banner_url: null; is_visible: boolean; is_open: boolean; is_revealed: boolean
  }[] = []
  const slugsSeen = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    if (!item.name?.trim()) {
      return Response.json({ error: `Row ${i + 1}: name is required` }, { status: 400 })
    }
    const slug = item.slug?.trim() ? toSlug(item.slug) : toSlug(item.name)
    if (slugsSeen.has(slug)) {
      return Response.json({ error: `Row ${i + 1}: duplicate slug "${slug}"` }, { status: 400 })
    }
    slugsSeen.add(slug)
    rows.push({
      name: item.name.trim(),
      slug,
      description: item.description?.trim() ?? '',
      day_number: item.day_number != null ? Number(item.day_number) : null,
      display_order: item.display_order != null ? Number(item.display_order) : i,
      banner_url: null,
      is_visible: false,
      is_open: false,
      is_revealed: false,
    })
  }

  const supabase = createServiceClient()

  // Check for slug conflicts with existing categories
  const { data: existing } = await supabase
    .from('categories')
    .select('slug')
    .in('slug', [...slugsSeen])

  if (existing && existing.length > 0) {
    const conflicts = existing.map((e) => e.slug as string).join(', ')
    return Response.json({ error: `Slugs already exist: ${conflicts}` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(rows)
    .select()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ created: data?.length ?? 0, categories: data }, { status: 201 })
}
