import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

interface StatCardProps {
  label: string
  value: number | string
  note?: string
  accent?: string
  icon: React.ReactNode
}

function StatCard({ label, value, note, accent = 'border-border', icon }: StatCardProps) {
  return (
    <div className={`bg-surface border ${accent} rounded-xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs uppercase tracking-widest">{label}</p>
        <span className="text-muted/50">{icon}</span>
      </div>
      <p className="text-foreground text-3xl font-bold font-serif leading-none">{value}</p>
      {note && <p className="text-muted text-xs">{note}</p>}
    </div>
  )
}

type CategoryStatus = {
  id: string
  name: string
  is_visible: boolean
  is_open: boolean
  is_revealed: boolean
}

export default async function AdminDashboard() {
  const supabase = createServiceClient()

  const [
    { count: studentCount },
    { count: voteCount },
    { count: openCount },
    { count: revealedCount },
    recentRes,
    categoryRes,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('votes').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_open', true),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_revealed', true),
    supabase
      .from('votes')
      .select('voted_at, categories:category_id(name)')
      .order('voted_at', { ascending: false })
      .limit(8),
    supabase
      .from('categories')
      .select('id, name, is_visible, is_open, is_revealed')
      .order('display_order', { ascending: true })
      .limit(10),
  ])

  type VoteRow = { voted_at: string; categories: unknown }
  const recentVotes = (recentRes.data ?? []) as VoteRow[]
  const categories  = (categoryRes.data ?? []) as CategoryStatus[]

  const quickActions = [
    { href: '/admin/categories',     label: 'Manage Categories', desc: 'Open, close & reveal',      color: 'border-gold/20 hover:border-gold/40 hover:bg-gold/5',         external: false },
    { href: '/admin/nominees',       label: 'Manage Nominees',   desc: 'Add or edit nominees',       color: 'border-border hover:border-foreground/20 hover:bg-surface-2', external: false },
    { href: '/admin/results',        label: 'View Results',      desc: 'Live vote counts',           color: 'border-border hover:border-foreground/20 hover:bg-surface-2', external: false },
    { href: '/admin/overrides',      label: 'Vote Overrides',    desc: 'Manual vote adjustments',    color: 'border-border hover:border-foreground/20 hover:bg-surface-2', external: false },
    { href: '/display/controller',   label: 'Display Controller',desc: 'Control the TV screen',      color: 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5', external: true },
  ]

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Welcome */}
      <div>
        <h2 className="font-serif text-2xl font-black text-foreground">Good day 👋</h2>
        <p className="text-muted text-sm mt-0.5">Here's what's happening with VUSRC Awards.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Students"
          value={studentCount ?? 0}
          note="Eligible voters"
          accent="border-border"
          icon={<StudentIcon />}
        />
        <StatCard
          label="Votes Cast"
          value={voteCount ?? 0}
          note="Across all categories"
          accent="border-gold/25"
          icon={<BallotIcon />}
        />
        <StatCard
          label="Open Now"
          value={openCount ?? 0}
          note="Categories accepting votes"
          accent={(openCount ?? 0) > 0 ? 'border-green-500/30' : 'border-border'}
          icon={<OpenIcon />}
        />
        <StatCard
          label="Revealed"
          value={revealedCount ?? 0}
          note="Results made public"
          accent="border-border"
          icon={<TrophyIcon />}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs text-muted uppercase tracking-widest mb-3">Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`bg-surface border rounded-xl p-4 transition-all group ${a.color}`}
            >
              <p className="text-foreground text-sm font-semibold group-hover:text-gold transition-colors flex items-center gap-1.5">
                {a.label}
                {a.external && <span className="text-[10px] text-muted/50">↗</span>}
              </p>
              <p className="text-muted text-xs mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category status */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Category Status</h3>
            <Link href="/admin/categories" className="text-gold text-xs hover:underline">Manage →</Link>
          </div>
          {categories.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted text-sm">No categories yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-2.5 gap-3">
                  <span className="text-sm text-foreground truncate flex-1">{c.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusDot on={c.is_visible} label="Visible" />
                    <StatusDot on={c.is_open}    label="Open" activeColor="bg-green-400" />
                    <StatusDot on={c.is_revealed} label="Revealed" activeColor="bg-gold" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent votes */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Votes</h3>
          </div>
          {recentVotes.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted text-sm">No votes yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recentVotes.map((v, i) => {
                const catName = (v.categories as { name: string } | null)?.name ?? '—'
                const time = formatTime(v.voted_at)
                return (
                  <li key={i} className="flex items-center justify-between px-5 py-2.5 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/60 flex-shrink-0" aria-hidden />
                      <span className="text-sm text-foreground/70 truncate">
                        Voted in <span className="text-foreground font-medium">{catName}</span>
                      </span>
                    </div>
                    <time className="text-muted text-xs tabular-nums flex-shrink-0">{time}</time>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusDot({ on, label, activeColor = 'bg-gold' }: { on: boolean; label: string; activeColor?: string }) {
  return (
    <span title={`${label}: ${on ? 'on' : 'off'}`} className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${on ? activeColor : 'bg-border'}`} aria-hidden />
      <span className="text-[10px] text-muted hidden sm:inline">{label}</span>
    </span>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000)  return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StudentIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}
function BallotIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function OpenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function TrophyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
}
