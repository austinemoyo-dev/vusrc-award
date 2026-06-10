import { notFound, redirect } from 'next/navigation'
import { getStudentSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Nominee } from '@/types'
import { CategoryHero } from '@/components/student/CategoryHero'
import { NomineeSection } from '@/components/student/NomineeSection'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CategoryVotePage({ params }: Props) {
  const { slug } = await params

  const session = await getStudentSession()
  if (!session) redirect('/login')

  const supabase = createServiceClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_visible', true)
    .maybeSingle()

  if (!category) notFound()

  const [nomineesRes, voteRes] = await Promise.all([
    supabase
      .from('nominees')
      .select('*')
      .eq('category_id', category.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('votes')
      .select('nominee_id')
      .eq('student_id', session.studentId)
      .eq('category_id', category.id)
      .maybeSingle(),
  ])

  const nominees = (nomineesRes.data ?? []) as Nominee[]
  const existingVoteNomineeId = (voteRes.data?.nominee_id as string | undefined) ?? null

  const isVotingOpen =
    (category.is_open as boolean) &&
    (!(category.closes_at as string | null) ||
      new Date(category.closes_at as string) > new Date())

  return (
    <main className="bg-base">

      {/* ── Full-screen cinematic intro ─────────────────────────────────── */}
      <CategoryHero
        name={category.name as string}
        description={category.description as string | null}
        bannerUrl={category.banner_url as string | null}
        dayNumber={category.day_number as number | null}
        isVotingOpen={isVotingOpen}
        closesAt={category.closes_at as string | null}
        nomineeCount={nominees.length}
      />

      {/* ── Nominees ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-10 md:px-8">
        {nominees.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
              <span className="text-3xl" aria-hidden>🏆</span>
            </div>
            <p className="text-foreground/50 font-medium">No nominees added yet</p>
            <p className="text-muted text-sm">Check back soon.</p>
          </div>
        ) : (
          <NomineeSection
            categoryId={category.id as string}
            categoryName={category.name as string}
            nominees={nominees}
            existingVoteNomineeId={existingVoteNomineeId}
            isVotingOpen={isVotingOpen}
          />
        )}
      </div>

    </main>
  )
}
