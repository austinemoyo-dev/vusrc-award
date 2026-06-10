'use client'

import { useState, useEffect } from 'react'

type AdminRow = {
  id: string
  email: string
  role: 'admin' | 'superadmin'
  created_at: string
}

const inputCls = 'w-full bg-surface border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-gold/60 transition-colors'

interface Props { currentAdminId: string }

export function AdminsClient({ currentAdminId }: Props) {
  const [admins, setAdmins]       = useState<AdminRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [form, setForm]           = useState({ email: '', password: '', role: 'admin' })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)

  function notify(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4500)
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const res = await fetch('/api/admin/admins')
      if (res.ok) setAdmins(await res.json())
      setLoading(false)
    })()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as AdminRow & { error?: string }
      if (!res.ok) { setFormError(data.error ?? 'Failed to create admin'); return }
      setAdmins((p) => [...p, data])
      setShowAdd(false)
      setForm({ email: '', password: '', role: 'admin' })
      notify('success', `Admin ${data.email} created successfully`)
    } catch { setFormError('Network error')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, { method: 'DELETE' })
      const data = await res.json() as { error?: string }
      if (!res.ok) { notify('error', data.error ?? 'Delete failed'); return }
      setAdmins((p) => p.filter((a) => a.id !== id))
      setConfirmDeleteId(null)
      notify('success', 'Admin account removed')
    } catch { notify('error', 'Network error')
    } finally { setDeleting(false) }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl border px-5 py-3 text-sm shadow-lg max-w-sm ${
          toast.type === 'success' ? 'bg-green-900/80 border-green-500/30 text-green-300' : 'bg-red-900/80 border-red-500/30 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-black text-foreground">Admin Accounts</h1>
          <p className="text-muted text-sm mt-0.5">Manage who has access to the admin panel — superadmin only</p>
        </div>
        <button
          onClick={() => { setFormError(''); setShowAdd(true) }}
          className="flex items-center gap-2 bg-gold hover:bg-gold-light text-base font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <span className="text-lg leading-none mb-px">+</span> New Admin
        </button>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-400/80 text-sm">
        Admin credentials grant full access to student data, votes, and overrides. Only create accounts for trusted staff.
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-center text-muted text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Email', 'Role', 'Added', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted text-sm">No admins found.</td></tr>
              )}
              {admins.map((admin) => {
                const isSelf   = admin.id === currentAdminId
                const isSuper  = admin.role === 'superadmin'
                return (
                  <tr key={admin.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-foreground">
                      {admin.email}
                      {isSelf && <span className="ml-2 text-[10px] text-gold/60 border border-gold/20 rounded-full px-1.5 py-0.5">You</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isSuper
                        ? <span className="text-[11px] font-semibold bg-gold/10 border border-gold/20 text-gold rounded-full px-2 py-0.5">Super Admin</span>
                        : <span className="text-[11px] text-muted/70 border border-border rounded-full px-2 py-0.5">Admin</span>}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs tabular-nums">
                      {new Date(admin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-muted/30 text-xs">—</span>
                      ) : confirmDeleteId === admin.id ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted">Remove {admin.email.split('@')[0]}?</span>
                          <button onClick={() => void handleDelete(admin.id)} disabled={deleting} className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50">
                            {deleting ? '…' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-muted hover:text-foreground text-xs">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(admin.id)} className="text-muted hover:text-red-400 text-xs transition-colors">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add admin panel */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowAdd(false)} aria-hidden />
          <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-surface border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-serif font-bold text-foreground text-lg">New Admin</h2>
                <p className="text-muted text-xs mt-0.5">Create an admin account with email &amp; password</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors">
                <XIcon />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">⚠ {formError}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground/70 mb-1.5">Email Address *</label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value.toLowerCase() }))}
                  className={inputCls}
                  placeholder="admin@vision.edu.ng"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/70 mb-1.5">Password * <span className="text-muted font-normal">(min 8 characters)</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className={`${inputCls} pr-12`}
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors text-xs"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/70 mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(['admin', 'superadmin'] as const).map((r) => (
                    <button
                      key={r} type="button"
                      onClick={() => setForm((p) => ({ ...p, role: r }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.role === r
                          ? r === 'superadmin'
                            ? 'bg-gold/10 border-gold/40 text-gold'
                            : 'bg-foreground/5 border-foreground/20 text-foreground'
                          : 'border-border text-muted hover:border-muted/40 hover:text-foreground/70'
                      }`}
                    >
                      {r === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </button>
                  ))}
                </div>
                {form.role === 'superadmin' && (
                  <p className="text-amber-400/70 text-xs mt-1.5">Super admins can create/delete admins and apply vote overrides.</p>
                )}
              </div>

              <div className="pt-2 flex gap-3 pb-4">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl py-3 text-sm transition-colors">
                  {saving ? 'Creating…' : 'Create Admin'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-3 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
