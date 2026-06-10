import { redirect } from 'next/navigation'
import { getStudentSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { CategoryGrid } from '@/components/student/CategoryGrid'
import { PushNotificationPrompt } from '@/components/student/PushNotificationPrompt'
import { StudentHeader } from '@/components/student/StudentHeader'
import type { CategoryCardData } from '@/components/student/CategoryCard'
import type { Category } from '@/types'

type CategoryRow = Category & {
  nominees: { id: string }[]
}

export default async function VotePage() {
  const session = await getStudentSession()
  if (!session) redirect('/login')

  const supabase = createServiceClient()
  const year = new Date().getFullYear()

  const [categoriesRes, votesRes, studentRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*, nominees(id)')
      .eq('is_visible', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('votes')
      .select('category_id')
      .eq('student_id', session.studentId),
    supabase
      .from('students')
      .select('full_name')
      .eq('id', session.studentId)
      .maybeSingle(),
  ])

  const rows = (categoriesRes.data ?? []) as CategoryRow[]
  const votedIds = (votesRes.data ?? []).map((v) => v.category_id as string)
  const fullName = (studentRes.data?.full_name as string | undefined) ?? 'Student'
  const firstName = fullName.split(' ')[0]

  const categories: CategoryCardData[] = rows.map((row) => ({
    id:           row.id,
    name:         row.name,
    slug:         row.slug,
    description:  row.description,
    banner_url:   row.banner_url,
    day_number:   row.day_number,
    is_open:      row.is_open,
    nomineeCount: Array.isArray(row.nominees) ? row.nominees.length : 0,
  }))

  const openCount  = categories.filter((c) => c.is_open).length
  const votedCount = votedIds.length

  return (
    <>
      <PushNotificationPrompt />
      <StudentHeader name={firstName} votedCount={votedCount} totalOpen={openCount} />

      <main className="page-glow min-h-screen bg-base px-4 pt-10 pb-20 md:px-8">
        <div className="max-w-6xl mx-auto">

          {/* ── Page header ────────────────────────────────────────── */}
          <div className="mb-12">
            <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-4">
              Student Week {year}
            </p>
            <h1
              className="font-display font-light text-foreground/90 leading-none"
              style={{ fontSize: 'clamp(2.2rem, 7vw, 4rem)', letterSpacing: '0.06em' }}
            >
              Cast Your <em style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.75)' }}>Vote</em>
            </h1>
            {/* hairline rule */}
            <div className="mt-5 mb-4 h-px" style={{ width: 80, background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} aria-hidden />
            <p className="font-sans font-light text-foreground/30 text-sm max-w-md leading-relaxed">
              Each vote is final — choose carefully. Categories open throughout the week.
            </p>

            {/* Progress */}
            {openCount > 0 && (
              <div className="mt-6 flex items-center gap-4">
                <div className="w-32 h-px bg-surface-2 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-gold transition-all duration-700"
                    style={{ width: `${(votedCount / openCount) * 100}%`, height: 1 }}
                  />
                </div>
                <span className="font-sans font-light text-[11px] text-foreground/30 tabular-nums tracking-wide">
                  {votedCount} <span className="text-foreground/15">/</span> {openCount}
                </span>
                {votedCount === openCount && openCount > 0 && (
                  <span className="font-sans font-light text-[10px] text-gold/60 tracking-[0.3em] uppercase">Complete</span>
                )}
              </div>
            )}
          </div>

          {/* ── Category grid ───────────────────────────────────────── */}
          {categories.length === 0 ? (
            <EmptyState />
          ) : (
            <CategoryGrid categories={categories} votedCategoryIds={votedIds} />
          )}

        </div>
      </main>
    </>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
        <span className="text-3xl" aria-hidden>🏆</span>
      </div>
      <div>
        <p className="text-foreground font-semibold">No categories yet</p>
        <p className="text-muted text-sm mt-1">
          Award categories will appear here when they&apos;re released.
        </p>
      </div>
    </div>
  )
}
