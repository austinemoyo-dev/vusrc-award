'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

/* ── Types ────────────────────────────────────────────────────────────────── */

type OverrideAction = 'add' | 'remove' | 'transfer'

interface CatItem { id: string; name: string; display_order: number }

interface NomineeCard {
  id: string
  full_name: string
  photo_url: string
  department: string | null
  level: string | null
  organic_votes: number
  override_votes: number
  total_votes: number
}

interface HistoryRow {
  id: string
  performed_at: string
  admin_email: string
  category_name: string
  nominee_name: string
  transfer_to_nominee_name: string | null
  action: OverrideAction
  votes_delta: number
  reason: string
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function ActionBadge({ action }: { action: OverrideAction }) {
  const styles = {
    add: 'bg-green-500/10 text-green-400 border-green-500/20',
    remove: 'bg-red-500/10 text-red-400 border-red-500/20',
    transfer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  const labels = { add: '+ Add', remove: '− Remove', transfer: '→ Transfer' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[action]}`}>
      {labels[action]}
    </span>
  )
}

function exportHistoryCSV(history: HistoryRow[]) {
  const header = 'Date/Time,Admin,Category,Nominee,Transfer To,Action,Delta,Reason'
  const rows = history.map(
    (r) =>
      `"${new Date(r.performed_at).toLocaleString('en-GB')}","${r.admin_email}","${r.category_name}","${r.nominee_name}","${r.transfer_to_nominee_name ?? ''}","${r.action}",${r.votes_delta},"${r.reason.replace(/"/g, '""')}"`
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vote-overrides-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function OverridesClient() {
  // Category + nominee state
  const [categories, setCategories] = useState<CatItem[]>([])
  const [selectedCatId, setSelectedCatId] = useState('')
  const [nominees, setNominees] = useState<NomineeCard[]>([])
  const [nomineesLoading, setNomineesLoading] = useState(false)
  const [selectedNomineeId, setSelectedNomineeId] = useState('')

  // Override form
  const [action, setAction] = useState<OverrideAction>('add')
  const [delta, setDelta] = useState(1)
  const [transferToId, setTransferToId] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')

  // Password modal
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // History
  const [history, setHistory] = useState<HistoryRow[]>([])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 5000)
  }

  /* ── Fetchers ─────────────────────────────────────────────────────────── */

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    if (!res.ok) return
    const data = await res.json()
    const raw: CatItem[] = Array.isArray(data) ? data : (data.categories ?? [])
    const cats: CatItem[] = raw.map((c: CatItem) => ({
      id: c.id,
      name: c.name,
      display_order: c.display_order,
    }))
    setCategories(cats.sort((a, b) => a.display_order - b.display_order))
  }, [])

  const fetchNominees = useCallback(async (catId: string) => {
    setNomineesLoading(true)
    setNominees([])
    setSelectedNomineeId('')
    try {
      const res = await fetch(`/api/display/category/${catId}`)
      if (!res.ok) return
      const data = await res.json()
      setNominees((data.nominees as NomineeCard[]) ?? [])
    } finally {
      setNomineesLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    const res = await fetch('/api/admin/overrides')
    if (!res.ok) return
    const data = await res.json()
    setHistory((data.history as HistoryRow[]) ?? [])
  }, [])

  useEffect(() => {
    void fetchCategories()
    void fetchHistory()
  }, [fetchCategories, fetchHistory])

  useEffect(() => {
    if (selectedCatId) void fetchNominees(selectedCatId)
    else { setNominees([]); setSelectedNomineeId('') }
  }, [selectedCatId, fetchNominees])

  /* ── Form ─────────────────────────────────────────────────────────────── */

  const selectedNominee = nominees.find((n) => n.id === selectedNomineeId) ?? null

  function validate(): string | null {
    if (delta < 1) return 'Vote count must be at least 1'
    if (reason.trim().length < 10) return 'Reason must be at least 10 characters'
    if (action === 'remove' && selectedNominee && delta > selectedNominee.override_votes) {
      return `Cannot remove more than current override votes (${selectedNominee.override_votes})`
    }
    if (action === 'transfer') {
      if (!transferToId) return 'Select a transfer target nominee'
      if (transferToId === selectedNomineeId) return 'Cannot transfer to the same nominee'
      if (selectedNominee && delta > selectedNominee.organic_votes) {
        return `Cannot transfer more than the nominee's organic votes (${selectedNominee.organic_votes})`
      }
    }
    return null
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setFormError(err); return }
    setFormError('')
    setPassword('')
    setPasswordError('')
    setShowModal(true)
  }

  /* ── Password modal confirm ───────────────────────────────────────────── */

  async function handlePasswordConfirm() {
    if (isSubmitting || !password) return
    setIsSubmitting(true)
    setPasswordError('')

    try {
      // Step 1: verify password
      const verifyRes = await fetch('/api/admin/overrides/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData.valid) {
        setPasswordError('Incorrect password. Action cancelled.')
        setTimeout(() => { setShowModal(false); setPassword(''); setPasswordError('') }, 1800)
        return
      }

      // Step 2: execute override
      const overrideRes = await fetch('/api/admin/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomineeId: selectedNomineeId,
          categoryId: selectedCatId,
          action,
          votesDelta: delta,
          transferToNomineeId: action === 'transfer' ? transferToId : undefined,
          reason,
          confirmedPassword: password,
        }),
      })
      const overrideData = await overrideRes.json()

      setShowModal(false)
      setPassword('')

      if (overrideRes.ok) {
        if (action === 'transfer') {
          const toName = nominees.find((n) => n.id === transferToId)?.full_name ?? 'recipient'
          showToast(
            'success',
            `Transfer applied. ${selectedNominee?.full_name ?? 'Nominee'}: ${overrideData.newTotal} votes. ${toName}: ${overrideData.transferToNewTotal} votes.`
          )
        } else {
          showToast('success', `Override applied. New total for this nominee: ${overrideData.newTotal} votes.`)
        }
        // Reset form (keep category)
        setSelectedNomineeId('')
        setAction('add')
        setDelta(1)
        setTransferToId('')
        setReason('')
        setFormError('')
        // Refresh nominees + history
        await fetchNominees(selectedCatId)
        await fetchHistory()
      } else {
        showToast('error', overrideData.error ?? 'Override failed. Please try again.')
      }
    } catch {
      setShowModal(false)
      showToast('error', 'Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const otherNominees = nominees.filter((n) => n.id !== selectedNomineeId)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl border px-5 py-3 text-sm shadow-lg max-w-sm ${
            toast.type === 'success'
              ? 'bg-green-900/80 border-green-500/30 text-green-300'
              : 'bg-red-900/80 border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-black text-foreground">Vote Override Panel</h1>
        <p className="text-muted text-sm mt-1">Manual vote adjustments — superadmin only</p>
      </div>

      {/* Warning banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mt-0.5 flex-shrink-0" aria-hidden>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p className="text-amber-400 text-sm font-semibold">All actions are permanently logged.</p>
          <p className="text-amber-400/70 text-xs mt-0.5">Overrides appear in the audit trail below and cannot be deleted or modified.</p>
        </div>
      </div>

      {/* ── Step 1: Category ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-xs text-gold/70 uppercase tracking-wider mb-3 font-semibold">Step 1 — Select Category</p>
        <select
          value={selectedCatId}
          onChange={(e) => setSelectedCatId(e.target.value)}
          className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold/40"
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Step 2: Nominee grid ──────────────────────────────────────────── */}
      {selectedCatId && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-gold/70 uppercase tracking-wider mb-3 font-semibold">Step 2 — Select Nominee</p>

          {nomineesLoading ? (
            <p className="text-muted text-sm py-4">Loading nominees…</p>
          ) : nominees.length === 0 ? (
            <p className="text-muted text-sm py-4">No nominees in this category.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {nominees.map((n) => {
                const selected = n.id === selectedNomineeId
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNomineeId(selected ? '' : n.id)}
                    className={`relative text-left rounded-xl border p-3 transition-all ${
                      selected
                        ? 'border-gold/50 bg-gold/5 ring-1 ring-gold/20'
                        : 'border-border bg-base hover:border-border/60 hover:bg-surface-2'
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {/* Photo */}
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-2 mb-2">
                      {n.photo_url ? (
                        <Image src={n.photo_url} alt={n.full_name} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted text-xl font-bold">{n.full_name[0]}</span>
                        </div>
                      )}
                    </div>
                    {/* Name */}
                    <p className={`text-xs font-semibold leading-tight truncate ${selected ? 'text-gold' : 'text-foreground'}`}>
                      {n.full_name}
                    </p>
                    {/* Vote breakdown */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="text-[10px] text-muted">Organic: {n.organic_votes}</span>
                      <span className="text-[10px] text-gold/70">Adj: {n.override_votes}</span>
                    </div>
                    <p className="text-[11px] font-bold text-foreground mt-0.5">Total: {n.total_votes}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Override form ─────────────────────────────────────────── */}
      {selectedNominee && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-gold/70 uppercase tracking-wider mb-4 font-semibold">Step 3 — Override Details</p>

          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-base border border-border">
            <div className="relative w-10 h-[52px] rounded-lg overflow-hidden bg-surface-2 flex-shrink-0">
              {selectedNominee.photo_url ? (
                <Image src={selectedNominee.photo_url} alt={selectedNominee.full_name} fill unoptimized className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted text-sm font-bold">{selectedNominee.full_name[0]}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">{selectedNominee.full_name}</p>
              <p className="text-muted text-xs mt-0.5">
                Organic: {selectedNominee.organic_votes} · Override: {selectedNominee.override_votes} · Total: {selectedNominee.total_votes}
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Action selector */}
            <div>
              <label className="block text-muted text-xs uppercase tracking-wider mb-2">Action</label>
              <div className="flex flex-wrap gap-2">
                {(['add', 'remove', 'transfer'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAction(a); setTransferToId('') }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      action === a
                        ? a === 'add'
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : a === 'remove'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'border-border text-muted hover:border-muted/50 hover:text-foreground/70'
                    }`}
                  >
                    {a === 'add' ? '+ Add Votes' : a === 'remove' ? '− Remove Votes' : '→ Transfer Votes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Votes count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
                  {action === 'add' ? 'Votes to Add' : action === 'remove' ? 'Votes to Remove' : 'Votes to Transfer'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={action === 'remove' ? selectedNominee.override_votes : undefined}
                  value={delta}
                  onChange={(e) => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gold/40"
                />
                {action === 'remove' && (
                  <p className="text-muted text-xs mt-1">Max: {selectedNominee.override_votes} (current override votes)</p>
                )}
              </div>

              {/* Transfer target */}
              {action === 'transfer' && (
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">Transfer To</label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full bg-base border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gold/40"
                  >
                    <option value="">Select target nominee…</option>
                    {otherNominees.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.full_name} (total: {n.total_votes})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
                Reason <span className="text-foreground/30">(min 10 characters)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for this override…"
                className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-foreground text-sm resize-none focus:outline-none focus:border-gold/40 placeholder:text-muted/40"
              />
              <p className="text-muted/50 text-xs mt-1 text-right">{reason.trim().length} / 10 min</p>
            </div>

            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors"
            >
              Confirm Override →
            </button>
          </form>
        </div>
      )}

      {/* ── History table ──────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-serif font-bold text-foreground">Override History</h2>
            <p className="text-muted text-xs mt-0.5">Immutable audit log · {history.length} records</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => exportHistoryCSV(history)}
              className="border border-border text-muted text-xs hover:text-foreground rounded-lg px-3 py-1.5 transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted text-sm">No overrides have been applied yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Date / Time', 'Admin', 'Category', 'Nominee', 'Action', 'Delta', 'Reason'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap tabular-nums">
                      {new Date(row.performed_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 text-xs whitespace-nowrap">{row.admin_email}</td>
                    <td className="px-4 py-3 text-foreground/70 text-xs whitespace-nowrap">{row.category_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-foreground">{row.nominee_name}</p>
                      {row.transfer_to_nominee_name && (
                        <p className="text-blue-400/70 text-xs mt-0.5">→ {row.transfer_to_nominee_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={row.action} />
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold tabular-nums text-sm">
                      <span className={
                        row.action === 'add' ? 'text-green-400'
                        : row.action === 'remove' ? 'text-red-400'
                        : 'text-blue-400'
                      }>
                        {row.action === 'add' ? '+' : row.action === 'remove' ? '−' : '→'}{row.votes_delta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs max-w-xs">
                      <p className="line-clamp-2">{row.reason}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Password confirmation modal ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!isSubmitting) { setShowModal(false); setPassword(''); setPasswordError('') } }}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Confirm with Password</h3>
                <p className="text-muted text-xs mt-0.5">Re-enter your password to authorise this action.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-4 p-3 rounded-lg bg-base border border-border text-xs text-muted space-y-1">
              <p><span className="text-foreground/50">Nominee:</span> <span className="text-foreground font-medium">{selectedNominee?.full_name}</span></p>
              <p>
                <span className="text-foreground/50">Action:</span>{' '}
                <span className={action === 'add' ? 'text-green-400' : action === 'remove' ? 'text-red-400' : 'text-blue-400'}>
                  {action === 'add' ? `+${delta} votes` : action === 'remove' ? `−${delta} votes` : `transfer ${delta} votes to ${nominees.find(n => n.id === transferToId)?.full_name ?? '…'}`}
                </span>
              </p>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handlePasswordConfirm()}
              placeholder="Your admin password"
              autoFocus
              disabled={isSubmitting}
              className="w-full bg-base border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold/40 mb-3 disabled:opacity-50"
            />

            {passwordError && (
              <p className="text-red-400 text-sm mb-3">{passwordError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { if (!isSubmitting) { setShowModal(false); setPassword(''); setPasswordError('') } }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-lg border border-border text-muted text-sm hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handlePasswordConfirm()}
                disabled={isSubmitting || !password}
                className="flex-1 py-2.5 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {isSubmitting ? 'Verifying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
