import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyCategoryOpened, notifyCategoryClosed } from '@/lib/push/send'

const TOGGLEABLE = ['is_visible', 'is_open', 'is_revealed'] as const
type ToggleField = (typeof TOGGLEABLE)[number]

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params

  let body: { field?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  const field = body.field as string
  if (!TOGGLEABLE.includes(field as ToggleField)) {
    return Response.json(
      { error: `field must be one of: ${TOGGLEABLE.join(', ')}`, code: 'bad_request' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data: current, error: fetchErr } = await supabase
    .from('categories')
    .select('is_open, is_visible, is_revealed, name, slug')
    .eq('id', id)
    .single()

  if (fetchErr || !current) {
    return Response.json({ error: 'Category not found', code: 'not_found' }, { status: 404 })
  }

  const newValue = !((current as unknown as Record<string, boolean>)[field] ?? false)

  // Opening a category implicitly makes it visible — a hidden open category is confusing
  const updates: Record<string, boolean> = { [field]: newValue }
  if (field === 'is_open' && newValue === true) {
    updates.is_visible = true
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message, code: 'db_error' }, { status: 500 })
  }

  // Fire push notifications when is_open changes — do not await so it never delays the response
  if (field === 'is_open') {
    const name = current.name as string
    const slug = current.slug as string
    if (newValue) {
      notifyCategoryOpened(name, slug).catch(() => {})
    } else {
      notifyCategoryClosed(name).catch(() => {})
    }
  }

  return Response.json(data)
}
