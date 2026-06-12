import { createServiceClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { NomineesClient } from '@/components/admin/NomineesClient'

export default async function NomineesPage() {
  const supabase = createServiceClient()

  const [nomineesRes, categoriesRes, votes] = await Promise.all([
    supabase.from('nominees').select('*').order('full_name'),
    supabase.from('categories').select('id, name, slug, display_order').order('display_order'),
    fetchAllRows((from, to) =>
      supabase.from('votes').select('nominee_id').range(from, to)
    ),
  ])

  const voteCountMap: Record<string, number> = {}
  for (const v of votes) {
    const nid = v.nominee_id as string
    voteCountMap[nid] = (voteCountMap[nid] ?? 0) + 1
  }

  const nominees = (nomineesRes.data ?? []).map((n) => ({
    id: n.id as string,
    category_id: n.category_id as string,
    full_name: n.full_name as string,
    photo_url: n.photo_url as string,
    bio: n.bio as string | null,
    department: n.department as string | null,
    level: n.level as string | null,
    override_votes: n.override_votes as number,
    organic_votes: voteCountMap[n.id as string] ?? 0,
  }))

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    display_order: c.display_order as number,
  }))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <NomineesClient initialNominees={nominees} categories={categories} />
    </div>
  )
}
