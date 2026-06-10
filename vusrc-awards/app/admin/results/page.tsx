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
        <button
          onClick={fetchResults}
          disabled={loading}
          className="border border-border text-muted text-sm hover:text-foreground rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh Now'}
        </button>
      </div>

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
                        height={Math.max(160, cat.nominees.length * 42)}
                      >
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fill: '#888888', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={96}
                            tick={{ fill: '#F5F5F5', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
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
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
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
    </div>
  )
}
