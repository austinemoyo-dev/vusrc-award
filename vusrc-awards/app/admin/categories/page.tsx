import { createServiceClient } from '@/lib/supabase/server'
import { CategoriesClient } from '@/components/admin/CategoriesClient'

export default async function CategoriesPage() {
  const supabase = createServiceClient()

  const [categoriesRes, nomineesRes] = await Promise.all([
    supabase.from('categories').select('*').order('display_order', { ascending: true }),
    supabase.from('nominees').select('category_id'),
  ])

  const countMap: Record<string, number> = {}
  for (const n of nomineesRes.data ?? []) {
    const id = n.category_id as string
    countMap[id] = (countMap[id] ?? 0) + 1
  }

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    description: c.description as string,
    banner_url: c.banner_url as string | null,
    day_number: c.day_number as number | null,
    opens_at: c.opens_at as string | null,
    closes_at: c.closes_at as string | null,
    is_visible: c.is_visible as boolean,
    is_open: c.is_open as boolean,
    is_revealed: c.is_revealed as boolean,
    display_order: c.display_order as number,
    nomineeCount: countMap[c.id as string] ?? 0,
  }))

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <CategoriesClient initialCategories={categories} />
    </div>
  )
}
