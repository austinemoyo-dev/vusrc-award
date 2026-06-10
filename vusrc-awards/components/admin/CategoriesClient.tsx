'use client'

import { useState, useRef } from 'react'

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string
  banner_url: string | null
  day_number: number | null
  opens_at: string | null
  closes_at: string | null
  is_visible: boolean
  is_open: boolean
  is_revealed: boolean
  display_order: number
  nomineeCount: number
}

type FormState = {
  name: string
  slug: string
  description: string
  day_number: string
  opens_at: string
  closes_at: string
  display_order: string
  banner_url: string
}

const emptyForm: FormState = {
  name: '', slug: '', description: '', day_number: '',
  opens_at: '', closes_at: '', display_order: '0', banner_url: '',
}

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '')
}

function fmtDatetime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

type BulkRow = { name: string; description: string; day_number: string; display_order: string }

const CSV_TEMPLATE = `name,description,day_number,display_order
Best Dressed,Who rocked the campus look this year?,1,1
Most Hardworking,The student who never stops pushing.,1,2
Best Couple,The duo everyone ships on campus.,2,3`

function parseCSV(text: string): BulkRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0]!.toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const get = (key: string) => cols[header.indexOf(key)] ?? ''
    return {
      name:          get('name'),
      description:   get('description'),
      day_number:    get('day_number'),
      display_order: get('display_order'),
    }
  }).filter((r) => r.name)
}

interface Props {
  initialCategories: CategoryRow[]
}

export function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [showPanel, setShowPanel] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  // Bulk upload state
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkError, setBulkError] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function openNew() {
    setEditingId(null); setForm(emptyForm); setBannerFile(null)
    setBannerPreview(''); setError(''); setShowPanel(true)
  }

  function openEdit(cat: CategoryRow) {
    setEditingId(cat.id)
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description,
      day_number: cat.day_number?.toString() ?? '',
      opens_at: toDatetimeLocal(cat.opens_at), closes_at: toDatetimeLocal(cat.closes_at),
      display_order: cat.display_order.toString(), banner_url: cat.banner_url ?? '',
    })
    setBannerFile(null); setBannerPreview(cat.banner_url ?? ''); setError(''); setShowPanel(true)
  }

  async function handleToggle(id: string, field: 'is_visible' | 'is_open' | 'is_revealed') {
    const key = `${id}-${field}`
    setToggling(key)
    try {
      const res = await fetch(`/api/admin/categories/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      })
      if (!res.ok) return
      const updated = await res.json()
      setCategories((p) => p.map((c) => (c.id === id ? { ...c, ...updated } : c)))
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Delete failed'); return }
      setCategories((p) => p.filter((c) => c.id !== id))
      setConfirmDeleteId(null)
    } finally { setDeleting(false) }
  }

  async function uploadBanner(): Promise<string> {
    if (!bannerFile) return form.banner_url
    const fd = new FormData()
    fd.append('file', bannerFile); fd.append('type', 'category-banner')
    fd.append('id', editingId ?? `cat-${Date.now()}`)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    return data.url as string
  }

  function openBulk() {
    setBulkText(''); setBulkRows([]); setBulkError(''); setBulkResult(null); setShowBulk(true)
  }

  function handleBulkTextChange(text: string) {
    setBulkText(text); setBulkError(''); setBulkResult(null)
    if (text.trim()) setBulkRows(parseCSV(text))
    else setBulkRows([])
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
    const a = document.createElement('a'); a.href = url; a.download = 'categories-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBulkSubmit() {
    if (bulkRows.length === 0) { setBulkError('No valid rows to import'); return }
    setBulkSaving(true); setBulkError(''); setBulkResult(null)
    try {
      const res = await fetch('/api/admin/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: bulkRows.map((r, i) => ({
            name: r.name,
            description: r.description || undefined,
            day_number: r.day_number ? parseInt(r.day_number) : undefined,
            display_order: r.display_order ? parseInt(r.display_order) : i,
          })),
        }),
      })
      const data = await res.json() as { error?: string; created?: number; categories?: CategoryRow[] }
      if (!res.ok) { setBulkError(data.error ?? 'Upload failed'); return }
      const newCats = (data.categories ?? []).map((c) => ({ ...c, nomineeCount: 0 }))
      setCategories((p) => [...p, ...newCats])
      setBulkResult(`${data.created} ${data.created === 1 ? 'category' : 'categories'} created successfully`)
      setBulkRows([]); setBulkText('')
    } catch {
      setBulkError('Network error')
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const bannerUrl = await uploadBanner()
      const payload = {
        name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(),
        day_number: form.day_number ? parseInt(form.day_number) : null,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
        display_order: parseInt(form.display_order) || 0, banner_url: bannerUrl || null,
      }
      const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories'
      const res = await fetch(url, { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      if (editingId) {
        setCategories((p) => p.map((c) => (c.id === editingId ? { ...data, nomineeCount: c.nomineeCount } : c)))
      } else {
        setCategories((p) => [...p, { ...data, nomineeCount: 0 }])
      }
      setShowPanel(false); setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-black text-foreground">Categories</h1>
          <p className="text-muted text-sm mt-0.5">{categories.length} award {categories.length === 1 ? 'category' : 'categories'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openBulk}
            className="flex items-center gap-2 border border-border hover:border-foreground/25 text-muted hover:text-foreground text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <UploadIcon />
            Bulk Upload
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light active:bg-gold-muted text-base font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <span className="text-lg leading-none mb-px">+</span>
            New Category
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted mb-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-surface-2 border border-border inline-block" />Off</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gold/20 border border-gold/40 inline-block" />On</span>
        <span className="text-muted/50">· Click any badge to toggle</span>
      </div>

      {/* Cards */}
      {sorted.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl px-6 py-14 text-center">
          <p className="text-foreground/50 font-medium">No categories yet</p>
          <p className="text-muted text-sm mt-1">Click &ldquo;New Category&rdquo; to create your first award category.</p>
          <button onClick={openNew} className="mt-4 bg-gold hover:bg-gold-light text-base font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            Create Category
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((cat) => {
            const opensAt  = fmtDatetime(cat.opens_at)
            const closesAt = fmtDatetime(cat.closes_at)
            return (
              <div key={cat.id} className="bg-surface border border-border rounded-xl p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base">{cat.name}</h3>
                      {cat.day_number != null && (
                        <span className="text-[10px] font-semibold text-gold/70 border border-gold/20 rounded-full px-2 py-0.5">
                          Day {cat.day_number}
                        </span>
                      )}
                      <span className="text-muted text-xs font-mono">/{cat.slug}</span>
                    </div>
                    {cat.description && (
                      <p className="text-muted text-sm mt-1 line-clamp-1">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
                      <span>{cat.nomineeCount} nominee{cat.nomineeCount !== 1 ? 's' : ''}</span>
                      {opensAt  && <span>Opens {opensAt}</span>}
                      {closesAt && <span>Closes {closesAt}</span>}
                    </div>
                  </div>

                  {/* Right: toggles + actions */}
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Toggle pills */}
                    <div className="flex items-center gap-2">
                      {(['is_visible', 'is_open', 'is_revealed'] as const).map((field) => {
                        const labels = { is_visible: 'Visible', is_open: 'Open', is_revealed: 'Revealed' }
                        const colors = {
                          is_visible: { on: 'bg-blue-500/15 border-blue-400/40 text-blue-300',   dot: 'bg-blue-400' },
                          is_open:    { on: 'bg-green-500/15 border-green-400/40 text-green-300', dot: 'bg-green-400' },
                          is_revealed:{ on: 'bg-gold/15 border-gold/40 text-gold',                dot: 'bg-gold' },
                        }
                        const on   = cat[field]
                        const busy = toggling === `${cat.id}-${field}`
                        const cls  = on ? colors[field].on : 'bg-surface-2 border-border text-muted hover:border-foreground/25 hover:text-foreground/70'
                        return (
                          <button
                            key={field}
                            onClick={() => handleToggle(cat.id, field)}
                            disabled={busy}
                            title={on ? `Turn off ${labels[field]}` : `Turn on ${labels[field]}`}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-all disabled:opacity-50 min-w-[72px] justify-center ${cls}`}
                          >
                            {busy ? (
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${on ? colors[field].dot : 'bg-foreground/20'}`} aria-hidden />
                            )}
                            {labels[field]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex items-center gap-1 ml-auto sm:ml-0">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      {confirmDeleteId === cat.id ? (
                        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-red-400">Delete?</span>
                          <button onClick={() => handleDelete(cat.id)} disabled={deleting} className="text-red-400 hover:text-red-300 text-xs font-semibold disabled:opacity-50">Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-muted hover:text-foreground text-xs">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(cat.id)}
                          className="p-2 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk upload modal */}
      {showBulk && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setShowBulk(false)} aria-hidden />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div>
                  <h2 className="font-serif font-bold text-foreground text-lg">Bulk Upload Categories</h2>
                  <p className="text-muted text-xs mt-0.5">Paste CSV or upload a file — up to 100 categories at once</p>
                </div>
                <button onClick={() => setShowBulk(false)} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors"><XIcon /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Template download */}
                <div className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">CSV Template</p>
                    <p className="text-xs text-muted mt-0.5">Columns: name, description, day_number, display_order</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="text-gold text-sm font-semibold hover:text-gold-light transition-colors flex items-center gap-1.5"
                  >
                    <DownloadIcon /> Download
                  </button>
                </div>

                {/* File input */}
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1.5">Upload CSV file</label>
                  <input
                    ref={bulkFileRef}
                    type="file" accept=".csv,text/csv"
                    onChange={handleBulkFile}
                    className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 transition-colors cursor-pointer"
                  />
                </div>

                {/* Or paste CSV */}
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1.5">Or paste CSV directly</label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => handleBulkTextChange(e.target.value)}
                    rows={6}
                    placeholder={`name,description,day_number,display_order\nBest Dressed,Who wore it best?,1,1\nMost Hardworking,,1,2`}
                    className={`${inputCls} font-mono text-xs resize-none`}
                    spellCheck={false}
                  />
                </div>

                {/* Preview table */}
                {bulkRows.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground/70 mb-2">{bulkRows.length} {bulkRows.length === 1 ? 'row' : 'rows'} detected</p>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface-2 border-b border-border">
                            <th className="text-left px-3 py-2 text-muted font-medium">#</th>
                            <th className="text-left px-3 py-2 text-muted font-medium">Name</th>
                            <th className="text-left px-3 py-2 text-muted font-medium">Description</th>
                            <th className="text-left px-3 py-2 text-muted font-medium">Day</th>
                            <th className="text-left px-3 py-2 text-muted font-medium">Order</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bulkRows.slice(0, 20).map((r, i) => (
                            <tr key={i} className={!r.name ? 'bg-red-500/5' : ''}>
                              <td className="px-3 py-2 text-muted">{i + 1}</td>
                              <td className="px-3 py-2 text-foreground font-medium max-w-[160px] truncate">{r.name || <span className="text-red-400">missing</span>}</td>
                              <td className="px-3 py-2 text-muted max-w-[180px] truncate">{r.description || '—'}</td>
                              <td className="px-3 py-2 text-muted">{r.day_number || '—'}</td>
                              <td className="px-3 py-2 text-muted">{r.display_order || i}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkRows.length > 20 && (
                        <p className="px-3 py-2 text-xs text-muted border-t border-border">… and {bulkRows.length - 20} more</p>
                      )}
                    </div>
                  </div>
                )}

                {bulkError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
                    <span className="flex-shrink-0">⚠</span>{bulkError}
                  </div>
                )}

                {bulkResult && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm flex items-start gap-2">
                    <span className="flex-shrink-0">✓</span>{bulkResult}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
                <p className="text-muted text-xs">{bulkRows.length > 0 ? `Ready to create ${bulkRows.length} categor${bulkRows.length === 1 ? 'y' : 'ies'}` : 'No data yet'}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowBulk(false)} className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-2.5 text-sm transition-colors">
                    {bulkResult ? 'Close' : 'Cancel'}
                  </button>
                  {!bulkResult && (
                    <button
                      onClick={() => void handleBulkSubmit()}
                      disabled={bulkSaving || bulkRows.length === 0}
                      className="bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl px-5 py-2.5 text-sm transition-colors"
                    >
                      {bulkSaving ? 'Creating…' : `Create ${bulkRows.length || ''} Categor${bulkRows.length === 1 ? 'y' : 'ies'}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Backdrop */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => { setShowPanel(false); setError('') }} aria-hidden />
      )}

      {/* Slide-over */}
      <div className={[
        'fixed inset-y-0 right-0 z-40 w-full sm:w-[520px] bg-surface border-l border-border flex flex-col shadow-2xl transition-transform duration-300',
        showPanel ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-foreground text-lg">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>
            <p className="text-muted text-xs mt-0.5">{editingId ? 'Update category details' : 'Create a new award category'}</p>
          </div>
          <button onClick={() => { setShowPanel(false); setError('') }} className="text-muted hover:text-foreground p-2 hover:bg-surface-2 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-px flex-shrink-0">⚠</span>
              {error}
            </div>
          )}

          <Field label="Category Name *">
            <input
              required value={form.name}
              onChange={(e) => { setField('name', e.target.value); if (!editingId) setField('slug', toSlug(e.target.value)) }}
              className={inputCls} placeholder="Best Dressed"
            />
          </Field>

          <Field label="URL Slug *" hint="Auto-generated from name">
            <input
              required value={form.slug}
              onChange={(e) => setField('slug', toSlug(e.target.value))}
              className={`${inputCls} font-mono text-sm`} placeholder="best-dressed"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3} className={inputCls} placeholder="Who rocked the campus look this year?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Day Number">
              <input type="number" min="1" value={form.day_number}
                onChange={(e) => setField('day_number', e.target.value)}
                className={inputCls} placeholder="1" />
            </Field>
            <Field label="Display Order">
              <input type="number" min="0" value={form.display_order}
                onChange={(e) => setField('display_order', e.target.value)}
                className={inputCls} placeholder="0" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Opens At">
              <input type="datetime-local" value={form.opens_at}
                onChange={(e) => setField('opens_at', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Closes At">
              <input type="datetime-local" value={form.closes_at}
                onChange={(e) => setField('closes_at', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Banner Image">
            {bannerPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerPreview} alt="Banner preview"
                className="w-full h-32 object-cover rounded-xl mb-3 border border-border" />
            )}
            <input
              type="file" accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return
                setBannerFile(f); setBannerPreview(URL.createObjectURL(f))
              }}
              className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 transition-colors cursor-pointer"
            />
            <p className="text-muted text-[11px] mt-1.5">Max 5 MB · JPEG, PNG, WebP</p>
          </Field>

          <div className="pt-2 flex gap-3 pb-4">
            <button type="submit" disabled={saving}
              className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-base font-bold rounded-xl py-3 text-sm transition-colors">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Category'}
            </button>
            <button type="button" onClick={() => { setShowPanel(false); setError('') }}
              className="border border-border text-muted hover:text-foreground rounded-xl px-5 py-3 text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

const inputCls = 'w-full bg-surface-2 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-muted/50 focus:outline-none focus:border-gold/60 transition-colors'

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

function UploadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}
function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
