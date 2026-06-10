import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, display_order, banner_url')
    .order('display_order', { ascending: true })
  return Response.json(data ?? [])
}
