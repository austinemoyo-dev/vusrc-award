import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

export type DisplayNominee = {
  id: string
  full_name: string
  photo_url: string
  department: string | null
  level: string | null
  bio: string | null
  organic_votes: number
  override_votes: number
  total_votes: number
}

export type DisplayCategory = {
  id: string
  name: string
  description: string
  banner_url: string | null
  is_revealed: boolean
  nominees: DisplayNominee[]
}

export async function getDisplayCategory(categoryId: string): Promise<DisplayCategory | null> {
  const supabase = createServiceClient()

  const [catRes, nomineesRes, votesRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, description, banner_url, is_revealed')
      .eq('id', categoryId)
      .maybeSingle(),
    supabase.from('nominees').select('*').eq('category_id', categoryId),
    supabase.from('votes').select('nominee_id').eq('category_id', categoryId),
  ])

  if (!catRes.data) return null

  const voteMap: Record<string, number> = {}
  for (const v of votesRes.data ?? []) {
    const nid = v.nominee_id as string
    voteMap[nid] = (voteMap[nid] ?? 0) + 1
  }

  const nominees: DisplayNominee[] = (nomineesRes.data ?? [])
    .map((n) => {
      const organic = voteMap[n.id as string] ?? 0
      const override = (n.override_votes as number) ?? 0
      return {
        id: n.id as string,
        full_name: n.full_name as string,
        photo_url: n.photo_url as string,
        department: n.department as string | null,
        level: n.level as string | null,
        bio: n.bio as string | null,
        organic_votes: organic,
        override_votes: override,
        total_votes: organic + override,
      }
    })
    .sort((a, b) => b.total_votes - a.total_votes)

  return {
    id: catRes.data.id as string,
    name: catRes.data.name as string,
    description: catRes.data.description as string,
    banner_url: catRes.data.banner_url as string | null,
    is_revealed: catRes.data.is_revealed as boolean,
    nominees,
  }
}

export async function getDisplayWinner(categoryId: string): Promise<DisplayNominee | null> {
  const data = await getDisplayCategory(categoryId)
  if (!data || data.nominees.length === 0) return null
  return data.nominees[0] ?? null
}
