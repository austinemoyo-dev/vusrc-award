'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Papa from 'papaparse'

type NomineeRow = {
  id: string
  category_id: string
  full_name: string
  photo_url: string
  bio: string | null
  department: string | null
  level: string | null
  override_votes: number
  organic_votes: number
}

type CategoryInfo = {
  id: string
  name: string
  slug: string
  display_order: number
}

type FormState = {
  full_name: string
  category_id: string
  bio: string
  department: string
  level: string
}

// Row after parsing CSV — may have errors
type ParsedRow = {
  full_name: string
  department: string
  level: string
  _error?: string
}

const emptyForm: FormState = {
  full_name: '', category_id: '', bio: '', department: '', level: '',
}

const TEMPLATE_CSV = `full_name,department,level
Jane Adeyemi,Computer Science,200L
John Okafor,Business Administration,300L
Amara Bello,Law,400L`

interface Props {
  initialNominees: NomineeRow[]
  categories: CategoryInfo[]
}

export function NomineesClient({ initialNominees, categories }: Props) {
  const [nominees,        setNominees]        = useState<NomineeRow[]>(initialNominees)
  const [expanded,        setExpanded]        = useState<Record<string, boolean>>({})
  const [showPanel,       setShowPanel]       = useState(false)
  const [editingId,       setEditingId]       = useState<string | null>(null)
  const [form,            setForm]            = useState<FormState>(emptyForm)
  const [photoFile,       setPhotoFile]       = useState<File | null>(null)
  const [photoPreview,    setPhotoPreview]    = useState('')
  const [existingPhoto,   setExistingPhoto]   = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting,        setDeleting]        = useState(false)

  // Bulk import state
  const [showImport,      setShowImport]      = useState(false)
  const [importCatId,     setImportCatId]     = useState('')
  const [parsedRows,      setParsedRows]      = useState<ParsedRow[]>([])
  const [importStep,      setImportStep]      = useState<'upload' | 'preview' | 'done'>('upload')
  const [importResult,    setImportResult]    = useState<{ created: number } | null>(null)
  const [importing,       setImporting]       = useState(false)
  const [importError,     setImportError]     = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function openNew() {
    setEditingId(null); setForm(emptyForm); setPhotoFile(null)
    setPhotoPreview(''); setExistingPhoto(''); setError(''); setShowPanel(true)
  }

  function openEdit(n: NomineeRow) {
    setEditingId(n.id)
    setForm({ full_name: n.full_name, category_id: n.category_id, bio: n.bio ?? '', department: n.department ?? '', level: n.level ?? '' })
    setPhotoFile(null); setPhotoPreview(n.photo_url); setExistingPhoto(n.photo_url)
    setError(''); setShowPanel(true)
  }

  async function uploadPhoto(): Promise<string> {
    if (!photoFile) return existingPhoto
    const fd = new FormData()
    fd.append('file', photoFile); fd.append('type', 'nominee-photo')
    fd.append('id', editingId ?? `nom-${Date.now()}`)
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId && !photoFile) { setError('Photo is required'); return }
    setSaving(true); setError('')
    try {
      const photo_url = await uploadPhoto()
      const payload = {
        full_name: form.full_name.trim(), category_id: form.category_id,
        bio: form.bio.trim() || null, department: form.department.trim() || null,
        level: form.level.trim() || null, photo_url,
      }
      const url    = editingId ? `/api/admin/nominees/${editingId}` : '/api/admin/nominees'
      const method = editingId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data   = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      if (editingId) {
        setNominees((p) => p.map((n) => (n.id === editingId ? { ...n, ...data } : n)))
      } else {
        setNominees((p) => [...p, { ...data, organic_votes: 0 }])
      }
      setShowPanel(false); setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/nominees/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Delete failed'); return }
      setNominees((p) => p.filter((n) => n.id !== id))
      setConfirmDeleteId(null)
    } finally { setDeleting(false) }
  }

  // ── Bulk import helpers ──────────────────────────────────────────────────────

  function openImport() {
    setImportCatId(''); setParsedRows([]); setImportStep('upload')
    setImportResult(null); setImportError(''); setShowImport(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleCSVFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (result) => {
        const rows: ParsedRow[] = result.data.map((row, i) => {
          const name = (row['full_name'] ?? row['name'] ?? '').trim()
          if (!name) return { full_name: '', department: '', level: '', _error: `Row ${i + 2}: full_name is required` }
          return {
            full_name:  name,
            department: (row['department'] ?? row['dept'] ?? '').trim(),
            level:      (row['level'] ?? '').trim(),
          }
        })
        setParsedRows(rows)
        setImportStep('preview')
        setImportError('')
      },
      error: (err) => setImportError(`Failed to parse CSV: ${err.message}`),
    })
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'nominees-template.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  async function handleBulkImport() {
    if (!importCatId) { setImportError('Please select a category'); return }
    const valid = parsedRows.filter((r) => !r._error && r.full_name)
    if (!valid.length) { setImportError('No valid rows to import'); return }
    setImporting(true); setImportError('')
    try {
      const res  = await fetch('/api/admin/nominees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: importCatId, nominees: valid }),
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Import failed'); return }
      // Merge newly created nominees into local state
      const fresh = (data.nominees as NomineeRow[]).map((n) => ({ ...n, organic_votes: 0 }))
      setNominees((p) => [...p, ...fresh])
      setImportResult({ created: data.created })
      setImportStep('done')
      // Auto-expand the target category
      setExpanded((p) => ({ ...p, [importCatId]: true }))
    } catch {
      setImportError('Network error. Please try again.')
    } finally { setImporting(false) }
  }

  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order)
  const validCount       = parsedRows.filter((r) => !r._error).length
  const errorCount       = parsedRows.filter((r) => !!r._error).length

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-black text-foreground">Nominees</h1>
          <p className="text-muted text-sm mt-0.5">{nominees.length} nominees across {categories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openImport}
            className="flex items-center gap-2 bg-surface border border-border hover:border-gold/40 hover:bg-gold/5 text-foreground text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
          >
            <UploadIcon />
            Import CSV
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light active:bg-gold-muted text-base font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <span className="text-lg leading-none mb-px">+</span>
            Add Nominee
          </button>
        </div>
      </div>

      {/* ── Category sections ───────────────────────────────────────────── */}
      <div className="space-y-3">
        {sortedCategories.map((cat) => {
          const catNominees = nominees.filter((n) => n.category_id === cat.id)
          const isOpen      = expanded[cat.id] !== false

          return (
            <div key={cat.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded((p) => ({ ...p, [cat.id]: !isOpen }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{cat.name}</span>
                  <span className="text-muted text-xs bg-surface-2 rounded-full px-2 py-0.5">
                    {catNominees.length}
                  </span>
                </div>
                <ChevronIcon open={isOpen} />
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {catNominees.length === 0 ? (
                    <div className="px-5 py-5 flex items-center justify-between">
                      <p className="text-muted text-sm">No nominees yet.</p>
                      <button
                        onClick={() => { setImportCatId(cat.id); openImport() }}
                        className="text-gold text-xs hover:underline"
                      >
                        Import CSV →
                      </button>
                    </div>
                  ) : (
                    catNominees.map((n) => (
                      <div key={n.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2/30 transition-colors">
                        {/* Thumb */}
                        <div className="relative w-10 h-[52px] rounded-lg overflow-hidden bg-surface-2 flex-shrink-0">
                          {n.photo_url ? (
                            <Image src={n.photo_url} alt={n.full_name} fill className="object-cover" sizes="40px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-serif font-bold text-muted/40 text-lg">{n.full_name.charAt(0)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{n.full_name}</p>
                          <p className="text-muted text-xs truncate">
                            {[n.department, n.level].filter(Boolean).join(' · ') || <span className="italic">No dept/level</span>}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <p className="text-foreground text-sm font-semibold tabular-nums">{n.organic_votes + n.override_votes}</p>
                          <p className="text-muted text-[11px]">votes</p>
                        </div>

                        {!n.photo_url && (
                          <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 hidden sm:inline flex-shrink-0">
                            No photo
                          </span>
                        )}

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(n)}
                            className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          {confirmDeleteId === n.id ? (
                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs text-red-400">Delete?</span>
                              <button onClick={() => handleDelete(n.id)} disabled={deleting} className="text-red-400 hover:text-red-300 text-xs font-semibold disabled:opacity-50">Yes</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-muted hover:text-foreground text-xs">No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(n.id)}
                              className="p-2 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Single nominee slide-over ────────────────────────────────────── */}
      {showPanel && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => { setShowPanel(false); setError('') }} aria-hidden />}
      <div className={[
        'fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-surface border-l border-border flex flex-col shadow-2xl transition-transform duration-300',
        showPanel ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-foreground text-lg">{editingId ? 'Edit Nominee' : 'Add Nominee'}</h2>
            <p className="text-muted text-xs mt-0.5">Fill in the nominee details below</p>
          </div>
          <button onClick={() => { setShowPanel(false); setError('') }} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"><span>⚠</span>{error}</div>}

          <FField label="Category *">
            <select required value={form.category_id} onChange={(e) => setField('category_id', e.target.value)} className={selCls}>
              <option value="">Select category…</option>
              {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FField>

          <FField label="Full Name *">
            <input required value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} className={inputCls} placeholder="Jane Okonkwo" />
          </FField>

          <div className="grid grid-cols-2 gap-4">
            <FField label="Department">
              <input value={form.department} onChange={(e) => setField('department', e.target.value)} className={inputCls} placeholder="Computer Science" />
            </FField>
            <FField label="Level">
              <input value={form.level} onChange={(e) => setField('level', e.target.value)} className={inputCls} placeholder="400L" />
            </FField>
          </div>

          <FField label={editingId ? 'Photo (leave blank to keep current)' : 'Photo *'}>
            {photoPreview && (
              <div className="relative w-20 h-[100px] rounded-xl overflow-hidden border border-border mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              type="file" accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }}
              className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer"
            />
            <p className="text-muted text-[11px] mt-1">4:5 portrait, max 5 MB</p>
          </FField>

          <div className="pt-2 flex gap-3 pb-4">
            <button type="submit" disabled={saving} className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl py-3 text-sm transition-colors">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Nominee'}
            </button>
            <button type="button" onClick={() => { setShowPanel(false); setError('') }} className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-3 text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ── Bulk import modal ────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-serif font-bold text-foreground text-lg">Import Nominees from CSV</h2>
                <p className="text-muted text-xs mt-0.5">
                  {importStep === 'upload'  && 'Upload a CSV file with nominee details'}
                  {importStep === 'preview' && `${validCount} valid · ${errorCount} with errors`}
                  {importStep === 'done'    && `Import complete`}
                </p>
              </div>
              <button
                onClick={() => setShowImport(false)}
                className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Step: upload ── */}
              {importStep === 'upload' && (
                <div className="space-y-5">
                  {/* Category selector */}
                  <FField label="Target Category *">
                    <select
                      value={importCatId}
                      onChange={(e) => setImportCatId(e.target.value)}
                      className={selCls}
                    >
                      <option value="">Select which category to import into…</option>
                      {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FField>

                  {/* CSV format hint */}
                  <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-foreground/70 text-sm font-medium">Required CSV format</p>
                      <button onClick={downloadTemplate} className="text-gold text-xs hover:underline flex items-center gap-1">
                        <DownloadIcon /> Download template
                      </button>
                    </div>
                    <pre className="text-xs text-muted leading-relaxed font-mono overflow-x-auto">{`full_name,department,level\nJane Adeyemi,Computer Science,200L\nJohn Okafor,Business Admin,300L`}</pre>
                    <p className="text-muted text-xs">Only <code className="text-gold">full_name</code> is required. Photos must be added individually after import.</p>
                  </div>

                  {/* File drop zone */}
                  <label
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border hover:border-gold/40 rounded-xl py-10 cursor-pointer transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center group-hover:border-gold/30 transition-colors">
                      <UploadIcon large />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground/70 text-sm font-medium">Click to choose a CSV file</p>
                      <p className="text-muted text-xs mt-0.5">or drag and drop</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }}
                    />
                  </label>

                  {importError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{importError}</p>
                  )}
                </div>
              )}

              {/* ── Step: preview ── */}
              {importStep === 'preview' && (
                <div className="space-y-4">
                  {/* Category selector (in case they forgot) */}
                  {!importCatId && (
                    <FField label="Target Category *">
                      <select value={importCatId} onChange={(e) => setImportCatId(e.target.value)} className={selCls}>
                        <option value="">Select which category to import into…</option>
                        {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </FField>
                  )}

                  {importCatId && (
                    <div className="bg-gold/8 border border-gold/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="text-gold text-sm">Importing into:</span>
                      <span className="text-foreground text-sm font-semibold">{categories.find(c => c.id === importCatId)?.name}</span>
                    </div>
                  )}

                  {/* Summary badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-full px-3 py-1">
                      {validCount} valid {validCount === 1 ? 'row' : 'rows'}
                    </span>
                    {errorCount > 0 && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-full px-3 py-1">
                        {errorCount} {errorCount === 1 ? 'error' : 'errors'} — will be skipped
                      </span>
                    )}
                  </div>

                  {/* Preview table */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-2">
                          <tr className="border-b border-border">
                            <th className="text-left px-4 py-2.5 text-muted text-xs font-medium uppercase tracking-wider">#</th>
                            <th className="text-left px-4 py-2.5 text-muted text-xs font-medium uppercase tracking-wider">Full Name</th>
                            <th className="text-left px-4 py-2.5 text-muted text-xs font-medium uppercase tracking-wider">Department</th>
                            <th className="text-left px-4 py-2.5 text-muted text-xs font-medium uppercase tracking-wider">Level</th>
                            <th className="text-left px-4 py-2.5 text-muted text-xs font-medium uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {parsedRows.map((row, i) => (
                            <tr key={i} className={row._error ? 'bg-red-500/5' : 'hover:bg-surface-2/40'}>
                              <td className="px-4 py-2.5 text-muted text-xs">{i + 1}</td>
                              <td className="px-4 py-2.5 text-foreground font-medium">{row.full_name || <span className="text-muted italic">—</span>}</td>
                              <td className="px-4 py-2.5 text-muted">{row.department || '—'}</td>
                              <td className="px-4 py-2.5 text-muted">{row.level || '—'}</td>
                              <td className="px-4 py-2.5">
                                {row._error ? (
                                  <span className="text-red-400 text-xs" title={row._error}>✕ Error</span>
                                ) : (
                                  <span className="text-green-400 text-xs">✓ OK</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {importError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{importError}</p>
                  )}

                  <button
                    onClick={() => { setImportStep('upload'); setParsedRows([]); setImportError(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-muted text-xs hover:text-foreground transition-colors"
                  >
                    ← Upload a different file
                  </button>
                </div>
              )}

              {/* ── Step: done ── */}
              {importStep === 'done' && importResult && (
                <div className="py-8 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-foreground text-lg font-semibold">
                      {importResult.created} {importResult.created === 1 ? 'nominee' : 'nominees'} imported!
                    </p>
                    <p className="text-muted text-sm mt-1">
                      Nominees have been added to <span className="text-foreground">{categories.find(c => c.id === importCatId)?.name}</span>.
                      Add photos by clicking Edit on each nominee.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowImport(false)}
                className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                {importStep === 'done' ? 'Close' : 'Cancel'}
              </button>
              {importStep === 'preview' && (
                <button
                  onClick={handleBulkImport}
                  disabled={importing || !importCatId || validCount === 0}
                  className="bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl px-6 py-2.5 text-sm transition-colors flex items-center gap-2"
                >
                  {importing ? (
                    <><span className="w-3.5 h-3.5 border-2 border-[#03110D]/40 border-t-[#03110D] rounded-full animate-spin" />Importing…</>
                  ) : (
                    `Import ${validCount} ${validCount === 1 ? 'Nominee' : 'Nominees'}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Shared styles ─────────────────────────────────────────────────────────── */

const inputCls = 'w-full bg-surface-2 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-gold/60 transition-colors'
const selCls   = 'w-full bg-surface-2 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold/60 transition-colors'

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function UploadIcon({ large }: { large?: boolean }) {
  const s = large ? 24 : 16
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
}

function XIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
}
