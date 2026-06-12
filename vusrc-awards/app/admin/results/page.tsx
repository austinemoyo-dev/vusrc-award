'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

type ResultNominee = {
  id: string
  full_name: string
  department: string | null
  level: string | null
  photo_url: string
  organic_votes: number
  override_votes: number
  total_votes: number
  percentage: number
  rank: number
}

type CategoryResult = {
  id: string
  name: string
  slug: string
  is_revealed: boolean
  nominees: ResultNominee[]
  total_votes: number
}

const BAR_COLORS = ['#C9A84C', '#E8C96D', '#8B6914', '#4a3310', '#2a2a2a']

function getBarColor(index: number) {
  return BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)]
}

async function exportWinnersPDF(categories: CategoryResult[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 48
  let y = 64

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('VUSRC Awards — Winners', marginX, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, marginX, y)
  doc.setTextColor(0)
  y += 28

  const eligible = categories.filter((c) => c.nominees.length > 0)

  for (const cat of eligible) {
    const winner = cat.nominees.find((n) => n.rank === 1) ?? cat.nominees[0]

    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      y = 64
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(cat.name, marginX, y)
    y += 18

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)

    if (!cat.is_revealed) {
      doc.setTextColor(150)
      doc.text('Not yet revealed', marginX, y)
      doc.setTextColor(0)
      y += 22
      continue
    }

    if (!winner) {
      doc.setTextColor(150)
      doc.text('No votes cast', marginX, y)
      doc.setTextColor(0)
      y += 22
      continue
    }

    doc.setFont('helvetica', 'bold')
    doc.text(winner.full_name, marginX, y)
    const winnerNameWidth = doc.getTextWidth(winner.full_name)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(
      `  —  ${winner.total_votes} votes (${winner.percentage}%)`,
      marginX + winnerNameWidth,
      y
    )
    doc.setTextColor(0)
    y += 14

    const meta = [winner.department, winner.level].filter(Boolean).join(' · ')
    if (meta) {
      doc.setFontSize(10)
      doc.setTextColor(150)
      doc.text(meta, marginX, y)
      doc.setTextColor(0)
      doc.setFontSize(11)
      y += 14
    }

    y += 12
    doc.setDrawColor(220)
    doc.line(marginX, y - 6, pageWidth - marginX, y - 6)
    y += 8
  }

  doc.save('vusrc-awards-winners.pdf')
}

function exportCSV(cat: CategoryResult) {
  const header = 'Category,Nominee,Votes,Percentage'
  const rows = cat.nominees.map(
    (n) => `"${cat.name}","${n.full_name}",${n.total_votes},${n.percentage}%`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cat.slug}-results.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ResultsPage() {
  const [categories, setCategories] = useState<CategoryResult[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [votingBusy, setVotingBusy] = useState<'open' | 'close' | null>(null)
  const [votingError, setVotingError] = useState('')

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/results')
      if (!res.ok) return
      const data: CategoryResult[] = await res.json()
      setCategories(data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchResults()
    const id = setInterval(fetchResults, 30_000)
    return () => clearInterval(id)
  }, [fetchResults])

  function openResetModal() {
    setResetConfirmText('')
    setResetError('')
    setShowResetModal(true)
  }

  async function handleSetVoting(action: 'open' | 'close') {
    setVotingBusy(action)
    setVotingError('')
    try {
      const res = await fetch('/api/admin/categories/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVotingError(data.error ?? `Failed to ${action} voting`)
        return
      }
      await fetchResults()
    } catch {
      setVotingError('Network error')
    } finally {
      setVotingBusy(null)
    }
  }

  async function handleResetVotes() {
    setResetting(true)
    setResetError('')
    try {
      const res = await fetch('/api/admin/votes/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: resetConfirmText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResetError(data.error ?? 'Failed to reset votes')
        return
      }
      setShowResetModal(false)
      await fetchResults()
    } catch {
      setResetError('Network error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-black text-foreground">Results</h1>
          {lastUpdated && (
            <p className="text-muted text-xs mt-1">
              Last updated {lastUpdated.toLocaleTimeString('en-GB')} · auto-refreshes every 30 s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchResults}
            disabled={loading}
            className="border border-border text-muted text-sm hover:text-foreground rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh Now'}
          </button>
          <button
            onClick={() => void handleSetVoting('close')}
            disabled={votingBusy !== null}
            className="border border-border text-muted text-sm hover:text-foreground rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
          >
            {votingBusy === 'close' ? 'Closing…' : 'Close All Voting'}
          </button>
          <button
            onClick={() => void handleSetVoting('open')}
            disabled={votingBusy !== null}
            className="border border-green-500/30 text-green-400 text-sm hover:bg-green-500/10 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
          >
            {votingBusy === 'open' ? 'Opening…' : 'Open All Voting'}
          </button>
          <button
            onClick={() => void exportWinnersPDF(categories)}
            disabled={categories.length === 0}
            className="border border-gold/30 text-gold text-sm hover:bg-gold/10 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
          >
            Download Winners PDF
          </button>
          <button
            onClick={openResetModal}
            className="border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 rounded-xl px-4 py-2 transition-colors"
          >
            Reset All Votes
          </button>
        </div>
      </div>

      {votingError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
          <span className="mt-px flex-shrink-0">⚠</span>{votingError}
        </div>
      )}

      {loading && categories.length === 0 && (
        <div className="py-16 text-center text-muted">Loading results…</div>
      )}

      {/* Per-category sections */}
      <div className="space-y-10">
        {categories.map((cat) => {
          const chartData = cat.nominees.map((n) => {
            const parts = n.full_name.split(' ')
            const abbr = parts[0] + (parts[1] ? ` ${parts[1][0]}.` : '')
            return { name: abbr, votes: n.total_votes }
          })

          return (
            <div key={cat.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="font-serif font-bold text-foreground text-xl">{cat.name}</h2>
                  <p className="text-muted text-xs mt-0.5">
                    {cat.total_votes} total votes ·{' '}
                    {cat.is_revealed ? (
                      <span className="text-gold">Revealed</span>
                    ) : (
                      <span className="text-muted/60">Not revealed</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => exportCSV(cat)}
                  className="border border-border text-muted text-xs hover:text-foreground rounded-lg px-3 py-1.5 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              {cat.nominees.length === 0 ? (
                <p className="px-5 py-6 text-muted text-sm">No nominees in this category yet.</p>
              ) : (
                <>
                  {/* Chart */}
                  {cat.total_votes > 0 && (
                    <div className="px-5 pt-5 pb-2">
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(220, 60 + cat.nominees.length * 12)}
                      >
                        <BarChart
                          data={chartData}
                          margin={{ top: 24, right: 8, left: 0, bottom: 8 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#F5F5F5', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            angle={chartData.length > 5 ? -35 : 0}
                            textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                            height={chartData.length > 5 ? 60 : 30}
                          />
                          <YAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: '#888888', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={32}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(201,168,76,0.05)' }}
                            contentStyle={{
                              background: '#111111',
                              border: '1px solid #2a2a2a',
                              borderRadius: 8,
                              fontSize: 12,
                              color: '#F5F5F5',
                            }}
                          />
                          <Bar dataKey="votes" radius={[6, 6, 0, 0]} maxBarSize={48}>
                            <LabelList
                              dataKey="votes"
                              position="top"
                              fill="#F5F5F5"
                              fontSize={11}
                              fontWeight={600}
                            />
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={getBarColor(i)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border">
                          {['#', '', 'Nominee', 'Dept / Level', 'Votes', '%'].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wider font-medium whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {cat.nominees.map((n) => (
                          <tr key={n.id} className={n.rank === 1 ? 'bg-gold/5' : ''}>
                            <td className="px-4 py-3 text-muted font-medium tabular-nums">
                              {n.rank === 1 ? '🥇' : n.rank === 2 ? '🥈' : n.rank === 3 ? '🥉' : n.rank}
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative w-8 h-[42px] rounded-lg overflow-hidden bg-surface-2">
                                {n.photo_url ? (
                                  <Image
                                    src={n.photo_url}
                                    alt={n.full_name}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-muted/40 text-xs font-bold">
                                      {n.full_name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                              {n.full_name}
                            </td>
                            <td className="px-4 py-3 text-muted text-xs">
                              {[n.department, n.level].filter(Boolean).join(' · ') || '—'}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-foreground">
                              {n.total_votes}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-muted">{n.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Close voting & reset votes confirmation */}
      {showResetModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowResetModal(false)} aria-hidden />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-surface border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6">
              <h2 className="font-serif font-bold text-foreground text-lg">Reset all votes?</h2>
              <p className="text-muted text-sm mt-2">
                This will hide all revealed results, permanently delete every cast vote, and clear
                all manual vote overrides. Voting open/closed state is not affected. This cannot be undone.
              </p>
              <p className="text-muted text-sm mt-3">
                Type <span className="text-red-400 font-mono font-semibold">RESET VOTES</span> to confirm.
              </p>
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="mt-2 w-full bg-surface-2 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-red-500/60 transition-colors font-mono"
                placeholder="RESET VOTES"
                autoComplete="off"
              />
              {resetError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
                  <span className="mt-px flex-shrink-0">⚠</span>{resetError}
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => void handleResetVotes()}
                  disabled={resetting || resetConfirmText !== 'RESET VOTES'}
                  className="flex-1 bg-red-500/90 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl py-2.5 text-sm transition-colors"
                >
                  {resetting ? 'Resetting…' : 'Reset All Votes'}
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-2.5 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
