import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

const SCREENS = ['intro', 'parade', 'drumroll', 'reveal', 'leaderboard'] as const
type Screen = (typeof SCREENS)[number]

async function authorize(request: NextRequest): Promise<boolean> {
  const adminSession = await getAdminSession()
  if (adminSession) return true

  const expected = process.env.DISPLAY_CONTROLLER_CODE
  if (!expected) return false
  const provided = request.headers.get('x-display-code')
  return provided === expected
}

export async function PATCH(request: NextRequest) {
  if (!(await authorize(request))) {
    return Response.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  let body: { direction?: 'next' | 'prev'; jumpToCategory?: string; clearDisplay?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  let { data: state } = await supabase
    .from('display_state')
    .select('*')
    .limit(1)
    .maybeSingle()

  // Auto-initialize the single display_state row if it doesn't exist yet
  if (!state) {
    const { data: created } = await supabase
      .from('display_state')
      .insert({ current_category_id: null, current_screen: 'intro' })
      .select()
      .single()
    state = created
  }

  if (!state) {
    return Response.json({ error: 'Failed to initialize display state', code: 'db_error' }, { status: 500 })
  }

  // Return to standby (clear display)
  if ('clearDisplay' in body && body.clearDisplay) {
    await supabase
      .from('display_state')
      .update({ current_category_id: null, current_screen: 'intro', updated_at: new Date().toISOString() })
      .eq('id', state.id as string)
    return Response.json({ screen: 'intro', categoryId: null })
  }

  // Jump to a specific category
  if (body.jumpToCategory) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', body.jumpToCategory)
      .maybeSingle()

    await supabase
      .from('display_state')
      .update({
        current_category_id: body.jumpToCategory,
        current_screen: 'intro',
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id as string)

    return Response.json({
      screen: 'intro',
      categoryId: body.jumpToCategory,
      categoryName: (cat?.name as string) ?? '',
    })
  }

  // Navigate next/prev
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('display_order', { ascending: true })

  const cats = categories ?? []
  const screenIdx = SCREENS.indexOf((state.current_screen as Screen) ?? 'intro')
  const catIdx = cats.findIndex((c) => (c.id as string) === (state.current_category_id as string))

  let newScreenIdx = screenIdx
  let newCatIdx = catIdx < 0 ? 0 : catIdx

  if (body.direction === 'next') {
    newScreenIdx = screenIdx + 1
    if (newScreenIdx >= SCREENS.length) {
      newScreenIdx = 0
      newCatIdx = Math.min(newCatIdx + 1, cats.length - 1)
    }
  } else {
    newScreenIdx = screenIdx - 1
    if (newScreenIdx < 0) {
      newScreenIdx = SCREENS.length - 1
      newCatIdx = Math.max(newCatIdx - 1, 0)
    }
  }

  const newCat = cats[newCatIdx] ?? cats[0]
  const newScreen = SCREENS[newScreenIdx] ?? 'intro'

  await supabase
    .from('display_state')
    .update({
      current_category_id: (newCat?.id as string) ?? (state.current_category_id as string),
      current_screen: newScreen,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.id as string)

  return Response.json({
    screen: newScreen,
    categoryId: newCat?.id,
    categoryName: newCat?.name,
  })
}
