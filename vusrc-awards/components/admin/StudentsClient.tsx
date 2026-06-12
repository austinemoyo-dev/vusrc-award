'use client'

import { useState, useMemo, useRef } from 'react'

type StudentRow = {
  id: string
  matric_number: string
  full_name: string
  department: string | null
  level: string | null
  phone_number: string | null
  pin_set: boolean
  device_bound: boolean
  last_login_at: string | null
  failed_attempts: number
  locked_until: string | null
  vote_count: number
}

type BulkRow = { matric_number: string; full_name: string; department: string; level: string; phone_number: string }

const PAGE_SIZE = 50

const CSV_TEMPLATE = `matric_number,full_name,department,level,phone_number
VU/23/CS/001,John Adewale,Computer Science,300L,08012345678
VU/23/EE/042,Fatima Bello,Electrical Engineering,200L,08098765432
VU/22/MB/017,Chidi Okonkwo,Medicine & Surgery,400L,`

function parseCSV(text: string): BulkRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0]!.toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const get = (key: string) => cols[header.indexOf(key)] ?? ''
    return {
      matric_number: get('matric_number'),
      full_name:     get('full_name'),
      department:    get('department'),
      level:         get('level'),
      phone_number:  get('phone_number'),
    }
  }).filter((r) => r.matric_number && r.full_name)
}

const inputCls = 'w-full bg-surface border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-gold/60 transition-colors'

interface Props { initialStudents: StudentRow[]; initialRegistrationOpen: boolean }

export function StudentsClient({ initialStudents, initialRegistrationOpen }: Props) {
  const [students, setStudents]       = useState<StudentRow[]>(initialStudents)
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [pinFilter, setPinFilter]     = useState<'' | 'set' | 'not_set'>('')
  const [page, setPage]               = useState(0)
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null)
  const [resetting, setResetting]     = useState(false)
  const [resetMsg, setResetMsg]       = useState('')

  // Reset all PINs
  const [showResetAll, setShowResetAll] = useState(false)
  const [resetAllConfirmText, setResetAllConfirmText] = useState('')
  const [resetAllBusy, setResetAllBusy] = useState(false)
  const [resetAllError, setResetAllError] = useState('')

  // Account creation open/closed
  const [registrationOpen, setRegistrationOpen] = useState(initialRegistrationOpen)
  const [regBusy, setRegBusy]         = useState(false)
  const [regError, setRegError]       = useState('')

  // Add single student
  const [showAdd, setShowAdd]         = useState(false)
  const [addForm, setAddForm]         = useState({ matric_number: '', full_name: '', department: '', level: '', phone_number: '' })
  const [addSaving, setAddSaving]     = useState(false)
  const [addError, setAddError]       = useState('')

  // Bulk import
  const [showBulk, setShowBulk]       = useState(false)
  const [bulkText, setBulkText]       = useState('')
  const [bulkRows, setBulkRows]       = useState<BulkRow[]>([])
  const [bulkError, setBulkError]     = useState('')
  const [bulkSaving, setBulkSaving]   = useState(false)
  const [bulkResult, setBulkResult]   = useState<string | null>(null)
  const bulkFileRef                   = useRef<HTMLInputElement>(null)

  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort() as string[], [students])
  const levels      = useMemo(() => Array.from(new Set(students.map((s) => s.level).filter(Boolean))).sort() as string[], [students])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter((s) => {
      if (q && !s.full_name.toLowerCase().includes(q) && !s.matric_number.toLowerCase().includes(q) && !(s.phone_number ?? '').includes(q)) return false
      if (deptFilter && s.department !== deptFilter) return false
      if (levelFilter && s.level !== levelFilter) return false
      if (pinFilter === 'set' && !s.pin_set) return false
      if (pinFilter === 'not_set' && s.pin_set) return false
      return true
    })
  }, [students, search, deptFilter, levelFilter, pinFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function handleResetPin(id: string) {
    setResetting(true); setResetMsg('')
    try {
      const res = await fetch(`/api/admin/students/${id}/reset-pin`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setResetMsg(d.error ?? 'Reset failed'); return }
      setStudents((p) => p.map((s) => s.id === id ? { ...s, pin_set: false, device_bound: false } : s))
      setConfirmResetId(null); setResetMsg('PIN and device binding cleared.')
      setTimeout(() => setResetMsg(''), 4000)
    } finally { setResetting(false) }
  }

  async function handleResetAllPins() {
    setResetAllBusy(true); setResetAllError('')
    try {
      const res = await fetch('/api/admin/students/reset-all-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: resetAllConfirmText }),
      })
      const data = await res.json()
      if (!res.ok) { setResetAllError(data.error ?? 'Reset failed'); return }
      setStudents((p) => p.map((s) => ({ ...s, pin_set: false, device_bound: false })))
      setShowResetAll(false); setResetAllConfirmText('')
      setResetMsg(`All ${data.count ?? ''} student PINs reset. Everyone must register again.`)
      setTimeout(() => setResetMsg(''), 6000)
    } catch {
      setResetAllError('Network error')
    } finally { setResetAllBusy(false) }
  }

  async function handleSetRegistration(action: 'open' | 'close') {
    setRegBusy(true); setRegError('')
    try {
      const res = await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setRegError(data.error ?? `Failed to ${action} account creation`); return }
      setRegistrationOpen(action === 'open')
    } catch {
      setRegError('Network error')
    } finally { setRegBusy(false) }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault(); setAddSaving(true); setAddError('')
    try {
      const res  = await fetch('/api/admin/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      const data = await res.json() as StudentRow & { error?: string }
      if (!res.ok) { setAddError(data.error ?? 'Failed to add student'); return }
      setStudents((p) => [...p, data])
      setShowAdd(false); setAddForm({ matric_number: '', full_name: '', department: '', level: '', phone_number: '' })
    } catch { setAddError('Network error')
    } finally { setAddSaving(false) }
  }

  function handleBulkTextChange(text: string) {
    setBulkText(text); setBulkError(''); setBulkResult(null)
    setBulkRows(text.trim() ? parseCSV(text) : [])
  }

  function handleBulkFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleBulkTextChange(ev.target?.result as string)
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'students-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBulkSubmit() {
    if (!bulkRows.length) { setBulkError('No valid rows to import'); return }
    setBulkSaving(true); setBulkError(''); setBulkResult(null)
    try {
      const res  = await fetch('/api/admin/students/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ students: bulkRows }) })
      const data = await res.json() as { error?: string; created?: number; students?: StudentRow[] }
      if (!res.ok) { setBulkError(data.error ?? 'Import failed'); return }
      const newRows = (data.students ?? []).map((s) => ({ ...s, device_bound: false, vote_count: 0, phone_number: (s as StudentRow).phone_number ?? null, failed_attempts: 0, locked_until: null, last_login_at: null }))
      setStudents((p) => [...p, ...newRows])
      setBulkResult(`${data.created} student${data.created === 1 ? '' : 's'} imported successfully`)
      setBulkRows([]); setBulkText('')
    } catch { setBulkError('Network error')
    } finally { setBulkSaving(false) }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-black text-foreground">Students</h1>
          <p className="text-muted text-sm mt-0.5">
            {students.length} students · {filtered.length} shown · Account creation{' '}
            {registrationOpen
              ? <span className="text-green-400">open</span>
              : <span className="text-red-400">closed</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {registrationOpen ? (
            <button onClick={() => void handleSetRegistration('close')} disabled={regBusy}
              className="flex items-center gap-2 border border-border text-muted hover:text-foreground text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {regBusy ? 'Closing…' : 'Close Account Creation'}
            </button>
          ) : (
            <button onClick={() => void handleSetRegistration('open')} disabled={regBusy}
              className="flex items-center gap-2 border border-green-500/30 text-green-400 hover:bg-green-500/10 text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {regBusy ? 'Opening…' : 'Open Account Creation'}
            </button>
          )}
          <button onClick={() => { setResetAllConfirmText(''); setResetAllError(''); setShowResetAll(true) }}
            className="flex items-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm px-4 py-2.5 rounded-xl transition-colors">
            Reset All PINs
          </button>
          <button onClick={() => { setBulkText(''); setBulkRows([]); setBulkError(''); setBulkResult(null); setShowBulk(true) }}
            className="flex items-center gap-2 border border-border hover:border-foreground/25 text-muted hover:text-foreground text-sm px-4 py-2.5 rounded-xl transition-colors">
            <UploadIcon /> Bulk Import
          </button>
          <button onClick={() => { setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light text-base font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
            <span className="text-lg leading-none mb-px">+</span> Add Student
          </button>
        </div>
      </div>

      {regError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
          <span className="mt-px flex-shrink-0">⚠</span>{regError}
        </div>
      )}

      {resetMsg && (
        <div className={`mb-4 p-3 rounded-xl text-sm border ${resetMsg.includes('fail') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-success/10 border-success/20 text-success'}`}>
          {resetMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input type="search" placeholder="Search name, matric or phone…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="bg-surface border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted focus:outline-none focus:border-gold/60 transition-colors w-72"
        />
        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(0) }}
          className="bg-surface border border-border text-sm rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/60">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(0) }}
          className="bg-surface border border-border text-sm rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/60">
          <option value="">All Levels</option>
          {levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={pinFilter} onChange={(e) => { setPinFilter(e.target.value as '' | 'set' | 'not_set'); setPage(0) }}
          className="bg-surface border border-border text-sm rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/60">
          <option value="">All PIN Status</option>
          <option value="set">PIN Set</option>
          <option value="not_set">PIN Not Set</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Matric', 'Name', 'Phone', 'Dept / Level', 'PIN', 'Device', 'Votes', 'Last Login', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted text-sm">No students match your filters.</td></tr>
              )}
              {paged.map((s) => {
                const locked = s.locked_until && new Date(s.locked_until) > new Date()
                return (
                  <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-muted font-mono text-xs">{s.matric_number}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.full_name}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{s.phone_number ?? <span className="text-muted/30">—</span>}</td>
                    <td className="px-4 py-3 text-muted text-xs">{[s.department, s.level].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3">
                      {s.pin_set
                        ? <span className="text-[11px] font-semibold bg-success/10 border border-success/20 text-success rounded-full px-2 py-0.5">Set</span>
                        : <span className="text-[11px] text-muted/60 border border-border rounded-full px-2 py-0.5">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.device_bound
                        ? <span className="text-[11px] font-semibold bg-gold/10 border border-gold/20 text-gold rounded-full px-2 py-0.5">Bound</span>
                        : <span className="text-[11px] text-muted/60 border border-border rounded-full px-2 py-0.5">None</span>}
                    </td>
                    <td className="px-4 py-3 text-muted tabular-nums">{s.vote_count}</td>
                    <td className="px-4 py-3 text-muted text-xs tabular-nums whitespace-nowrap">
                      {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      {locked && <span className="ml-1.5 text-[10px] text-red-400">Locked</span>}
                    </td>
                    <td className="px-4 py-3">
                      {confirmResetId === s.id ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] text-muted leading-tight">Clear {s.full_name.split(' ')[0]}&apos;s PIN + device?</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleResetPin(s.id)} disabled={resetting} className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50">{resetting ? '…' : 'Confirm'}</button>
                            <button onClick={() => setConfirmResetId(null)} className="text-muted hover:text-foreground text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmResetId(s.id)} className="text-muted hover:text-gold text-xs transition-colors whitespace-nowrap">Reset PIN</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-muted text-xs">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="border border-border text-muted text-xs rounded-lg px-3 py-1.5 disabled:opacity-40 hover:text-foreground">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="border border-border text-muted text-xs rounded-lg px-3 py-1.5 disabled:opacity-40 hover:text-foreground">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add single student panel ───────────────────────────────────────── */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowAdd(false)} aria-hidden />
          <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-surface border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-serif font-bold text-foreground text-lg">Add Student</h2>
                <p className="text-muted text-xs mt-0.5">Add a single student to the system</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors"><XIcon /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {addError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">⚠ {addError}</div>}
              <Field label="Matric Number *">
                <input required value={addForm.matric_number} onChange={(e) => setAddForm((p) => ({ ...p, matric_number: e.target.value.toUpperCase() }))}
                  className={inputCls} placeholder="VU/23/CS/001" />
              </Field>
              <Field label="Full Name *">
                <input required value={addForm.full_name} onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))}
                  className={inputCls} placeholder="John Adewale" />
              </Field>
              <Field label="Phone Number" hint="For alternative login">
                <input type="tel" value={addForm.phone_number} onChange={(e) => setAddForm((p) => ({ ...p, phone_number: e.target.value }))}
                  className={inputCls} placeholder="08012345678" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department">
                  <input value={addForm.department} onChange={(e) => setAddForm((p) => ({ ...p, department: e.target.value }))}
                    className={inputCls} placeholder="Computer Science" />
                </Field>
                <Field label="Level">
                  <input value={addForm.level} onChange={(e) => setAddForm((p) => ({ ...p, level: e.target.value }))}
                    className={inputCls} placeholder="300L" />
                </Field>
              </div>
              <div className="pt-2 flex gap-3 pb-4">
                <button type="submit" disabled={addSaving} className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl py-3 text-sm transition-colors">
                  {addSaving ? 'Adding…' : 'Add Student'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-3 text-sm transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Bulk import modal ──────────────────────────────────────────────── */}
      {showBulk && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowBulk(false)} aria-hidden />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div>
                  <h2 className="font-serif font-bold text-foreground text-lg">Bulk Import Students</h2>
                  <p className="text-muted text-xs mt-0.5">Upload CSV — up to 1000 students at once</p>
                </div>
                <button onClick={() => setShowBulk(false)} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg"><XIcon /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Template */}
                <div className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">CSV Template</p>
                    <p className="text-xs text-muted mt-0.5">Columns: matric_number, full_name, department, level, <span className="text-gold/70">phone_number</span></p>
                  </div>
                  <button onClick={downloadTemplate} className="text-gold text-sm font-semibold hover:text-gold-light flex items-center gap-1.5">
                    <DownloadIcon /> Download
                  </button>
                </div>
                {/* File */}
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1.5">Upload CSV file</label>
                  <input ref={bulkFileRef} type="file" accept=".csv,text/csv" onChange={handleBulkFile}
                    className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer" />
                </div>
                {/* Paste */}
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1.5">Or paste CSV directly</label>
                  <textarea value={bulkText} onChange={(e) => handleBulkTextChange(e.target.value)} rows={5}
                    placeholder={`matric_number,full_name,department,level,phone_number\nVU/23/CS/001,John Adewale,Computer Science,300L,08012345678`}
                    className={`${inputCls} font-mono text-xs resize-none`} spellCheck={false} />
                </div>
                {/* Preview */}
                {bulkRows.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground/70 mb-2">{bulkRows.length} rows detected</p>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface-2 border-b border-border">
                            {['#', 'Matric', 'Name', 'Dept', 'Level', 'Phone'].map((h) => (
                              <th key={h} className="text-left px-3 py-2 text-muted font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bulkRows.slice(0, 15).map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-muted">{i + 1}</td>
                              <td className="px-3 py-2 font-mono text-foreground">{r.matric_number}</td>
                              <td className="px-3 py-2 text-foreground max-w-[120px] truncate">{r.full_name}</td>
                              <td className="px-3 py-2 text-muted max-w-[80px] truncate">{r.department || '—'}</td>
                              <td className="px-3 py-2 text-muted">{r.level || '—'}</td>
                              <td className="px-3 py-2 text-muted font-mono">{r.phone_number || <span className="text-muted/30">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkRows.length > 15 && <p className="px-3 py-2 text-xs text-muted border-t border-border">… and {bulkRows.length - 15} more</p>}
                    </div>
                  </div>
                )}
                {bulkError  && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">⚠ {bulkError}</div>}
                {bulkResult && <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm">✓ {bulkResult}</div>}
              </div>
              <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
                <p className="text-muted text-xs">{bulkRows.length > 0 ? `Ready to import ${bulkRows.length} student${bulkRows.length === 1 ? '' : 's'}` : 'No data yet'}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowBulk(false)} className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-2.5 text-sm">{bulkResult ? 'Close' : 'Cancel'}</button>
                  {!bulkResult && (
                    <button onClick={() => void handleBulkSubmit()} disabled={bulkSaving || !bulkRows.length}
                      className="bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl px-5 py-2.5 text-sm">
                      {bulkSaving ? 'Importing…' : `Import ${bulkRows.length || ''} Student${bulkRows.length === 1 ? '' : 's'}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reset all PINs confirmation */}
      {showResetAll && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowResetAll(false)} aria-hidden />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-surface border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6">
              <h2 className="font-serif font-bold text-foreground text-lg">Reset all student PINs?</h2>
              <p className="text-muted text-sm mt-2">
                This will clear the PIN and device binding for every student, free up all devices,
                and log the reset. Every student will need to register again with their matric number.
                This cannot be undone.
              </p>
              <p className="text-muted text-sm mt-3">
                Type <span className="text-red-400 font-mono font-semibold">RESET PINS</span> to confirm.
              </p>
              <input
                value={resetAllConfirmText}
                onChange={(e) => setResetAllConfirmText(e.target.value)}
                className="mt-2 w-full bg-surface-2 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-red-500/60 transition-colors font-mono"
                placeholder="RESET PINS"
                autoComplete="off"
              />
              {resetAllError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
                  <span className="mt-px flex-shrink-0">⚠</span>{resetAllError}
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => void handleResetAllPins()}
                  disabled={resetAllBusy || resetAllConfirmText !== 'RESET PINS'}
                  className="flex-1 bg-red-500/90 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl py-2.5 text-sm transition-colors"
                >
                  {resetAllBusy ? 'Resetting…' : 'Reset All PINs'}
                </button>
                <button
                  onClick={() => setShowResetAll(false)}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-xs font-medium text-foreground/70">{label}</label>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function UploadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
