import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()

  const [categoriesRes, nomineesRes, votesRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug, is_revealed, display_order').order('display_order'),
    supabase.from('nominees').select('id, category_id, full_name, department, level, photo_url, override_votes'),
    supabase.from('votes').select('nominee_id, category_id'),
  ])

  // Build organic vote count map
  const organicMap: Record<string, number> = {}
  for (const v of votesRes.data ?? []) {
    const nid = v.nominee_id as string
    organicMap[nid] = (organicMap[nid] ?? 0) + 1
  }

  // Group nominees by category
  const nomineesByCategory: Record<string, typeof nomineesRes.data> = {}
  for (const n of nomineesRes.data ?? []) {
    const cid = n.category_id as string
    nomineesByCategory[cid] ??= []
    nomineesByCategory[cid]!.push(n)
  }

  const categories = (categoriesRes.data ?? []).map((cat) => {
    const nominees = (nomineesByCategory[cat.id as string] ?? []).map((n) => {
      const organic = organicMap[n.id as string] ?? 0
      const override = (n.override_votes as number) ?? 0
      return {
        id: n.id as string,
        full_name: n.full_name as string,
        department: n.department as string | null,
        level: n.level as string | null,
        photo_url: n.photo_url as string,
        organic_votes: organic,
        override_votes: override,
        total_votes: organic + override,
      }
    })

    const categoryTotal = nominees.reduce((s, n) => s + n.total_votes, 0)

    const nomineesWithPct = nominees
      .map((n) => ({
        ...n,
        percentage: categoryTotal > 0 ? Math.round((n.total_votes / categoryTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total_votes - a.total_votes)
      .map((n, i) => ({ ...n, rank: i + 1 }))

    return {
      id: cat.id as string,
      name: cat.name as string,
      slug: cat.slug as string,
      is_revealed: cat.is_revealed as boolean,
      nominees: nomineesWithPct,
      total_votes: categoryTotal,
    }
  })

  return Response.json(categories)
}
