import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  let { data } = await supabase
    .from('display_state')
    .select('*')
    .limit(1)
    .maybeSingle()

  // Auto-initialize the single display_state row if it doesn't exist yet
  if (!data) {
    const { data: created } = await supabase
      .from('display_state')
      .insert({ current_category_id: null, current_screen: 'intro' })
      .select()
      .single()
    data = created
  }

  if (!data) return Response.json({ error: 'Failed to initialize display state' }, { status: 500 })
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
