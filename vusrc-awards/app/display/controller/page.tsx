'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribeToDisplayState } from '@/lib/realtime/display'
import type { DisplayState } from '@/types'

const SCREENS = ['intro', 'parade', 'drumroll', 'reveal', 'leaderboard'] as const
type Screen = (typeof SCREENS)[number]

const SCREEN_META: Record<Screen, { label: string; icon: string; color: string }> = {
  intro:       { label: 'Intro',    icon: '▶',  color: '#6366f1' },
  parade:      { label: 'Parade',   icon: '👥', color: '#0ea5e9' },
  drumroll:    { label: 'Drumroll', icon: '🥁', color: '#f59e0b' },
  reveal:      { label: 'Reveal',   icon: '🏆', color: '#C9A84C' },
  leaderboard: { label: 'Results',  icon: '📊', color: '#22c55e' },
}

interface Category {
  id: string
  name: string
  display_order: number
  banner_url: string | null
}

// ── Responsive iframe preview ──────────────────────────────────────────────────

function LivePreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef    = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0.35)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / 1280)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Container height = scale × 720
  const containerHeight = Math.round(scale * 720)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-white/35 text-[10px] uppercase tracking-[0.35em] font-semibold">Live Preview</p>
        <button
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
          className="text-white/20 text-[10px] hover:text-white/55 transition-colors"
          title="Reload preview"
        >
          ↺ Reload
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#050505]"
        style={{ height: containerHeight || 200 }}
      >
        <iframe
          ref={iframeRef}
          src="/display"
          title="Live TV preview"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1280,
            height: 720,
            border: 'none',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            pointerEvents: 'none',
          }}
        />

        {/* LIVE badge overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600/85 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
          <span className="text-white text-[10px] font-bold tracking-wider">LIVE</span>
        </div>
      </div>
    </div>
  )
}

// ── Main controller ────────────────────────────────────────────────────────────

export default function ControllerPage() {
  const [unlocked,   setUnlocked]   = useState(false)
  const [code,       setCode]       = useState('')
  const [codeError,  setCodeError]  = useState('')
  const [storedCode, setStoredCode] = useState('')

  const [displayState, setDisplayState] = useState<DisplayState | null>(null)
  const [categories,   setCategories]   = useState<Category[]>([])
  const [busy,         setBusy]         = useState(false)
  const [errorMsg,     setErrorMsg]     = useState('')

  // Restore session
  useEffect(() => {
    const granted = sessionStorage.getItem('ctrl_access') === 'granted'
    if (granted) {
      setStoredCode(sessionStorage.getItem('ctrl_code') ?? '')
      setUnlocked(true)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!unlocked) return
    const ch = subscribeToDisplayState((s) => setDisplayState(s))
    return () => void ch.unsubscribe()
  }, [unlocked])

  // Initial fetch
  useEffect(() => {
    if (!unlocked) return
    async function init() {
      const [sr, cr] = await Promise.all([
        fetch('/api/display/state', { cache: 'no-store' }),
        fetch('/api/display/categories', { cache: 'no-store' }),
      ])
      if (sr.ok) setDisplayState(await sr.json())
      if (cr.ok) setCategories(await cr.json())
    }
    void init()
  }, [unlocked])

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCodeError('')
    const expected = process.env.NEXT_PUBLIC_DISPLAY_CONTROLLER_CODE
    if (!expected || code === expected) {
      sessionStorage.setItem('ctrl_access', 'granted')
      sessionStorage.setItem('ctrl_code', code)
      setStoredCode(code)
      setUnlocked(true)
    } else {
      setCodeError('Incorrect access code')
    }
  }

  async function apiCall(body: Record<string, unknown>) {
    if (busy) return
    setBusy(true); setErrorMsg('')
    try {
      const res = await fetch('/api/admin/display/advance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-display-code': storedCode },
        body: JSON.stringify(body),
      })
      const d = await res.json() as { error?: string; screen?: string; categoryId?: string | null }
      if (!res.ok) {
        setErrorMsg(d.error ?? 'Action failed')
      } else {
        // Update controller state immediately from API response (don't wait for realtime)
        if ('screen' in d) {
          setDisplayState((prev) => prev
            ? { ...prev, current_screen: d.screen as DisplayState['current_screen'], current_category_id: d.categoryId ?? null }
            : prev
          )
        }
        // Re-fetch full state to sync (handles edge cases)
        const sr = await fetch('/api/display/state', { cache: 'no-store' })
        if (sr.ok) setDisplayState(await sr.json())
      }
    } catch {
      setErrorMsg('Network error — check your connection')
    } finally {
      setBusy(false)
    }
  }

  const advance  = useCallback((dir: 'next' | 'prev') => apiCall({ direction: dir }), [busy, storedCode]) // eslint-disable-line react-hooks/exhaustive-deps
  const jumpTo   = useCallback((id: string)            => apiCall({ jumpToCategory: id }), [busy, storedCode]) // eslint-disable-line react-hooks/exhaustive-deps
  const standby  = useCallback(()                      => apiCall({ clearDisplay: true }), [busy, storedCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!unlocked) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); void advance('next') }
      if (e.key === 'ArrowLeft')                   { e.preventDefault(); void advance('prev') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [unlocked, advance])

  // ── Lock screen ──────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#03110D] flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center">
              <span className="font-serif font-black text-[#C9A84C] text-2xl leading-none">V</span>
            </div>
            <p className="font-serif font-black text-[#C9A84C] text-lg tracking-[0.2em]">VUSRC</p>
            <p className="text-white/25 text-xs tracking-widest uppercase -mt-2">Display Controller</p>
          </div>

          <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-white/[0.06]">
              <h2 className="text-white font-semibold">Enter access code</h2>
              <p className="text-white/30 text-sm mt-0.5">Enter the event controller code to continue.</p>
            </div>
            <form onSubmit={handleCodeSubmit} className="px-7 py-6 flex flex-col gap-4">
              <input
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError('') }}
                placeholder="••••••••"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.4em] focus:outline-none focus:border-[#C9A84C]/60 transition-all"
              />
              {codeError && <p className="text-red-400 text-sm text-center">⚠ {codeError}</p>}
              <button type="submit" className="w-full py-3 rounded-xl bg-[#C9A84C] hover:bg-[#d4b558] text-[#03110D] font-bold transition-colors">
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Controller UI ────────────────────────────────────────────────────────────

  const currentCat    = categories.find((c) => c.id === displayState?.current_category_id)
  const currentScreen = (displayState?.current_screen ?? 'intro') as Screen
  const currentIdx    = SCREENS.indexOf(currentScreen)
  const isLive        = !!displayState?.current_category_id
  const nextScreen    = SCREENS[(currentIdx + 1) % SCREENS.length]!

  return (
    <div className="h-screen bg-[#03110D] text-white flex flex-col overflow-hidden select-none">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-5 border-b border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center">
            <span className="font-serif font-black text-[#C9A84C] text-sm leading-none">V</span>
          </div>
          <span className="font-semibold text-sm text-white/60">Display Controller</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
            isLive ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/4 border-white/8 text-white/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-400 animate-pulse' : 'bg-white/20'}`} />
            {isLive ? `LIVE — ${currentCat?.name ?? '…'}` : 'STANDBY'}
          </div>

          <span className="text-white/20 text-xs hidden md:block">← → or Space</span>

          <button
            onClick={() => { sessionStorage.removeItem('ctrl_access'); setUnlocked(false) }}
            className="text-white/25 text-xs hover:text-white/60 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-all"
          >
            Lock
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: preview + screen controls */}
        <div className="flex-1 flex flex-col gap-0 overflow-y-auto p-5 min-w-0 space-y-4">

          {/* Live iframe preview */}
          <LivePreview />

          {/* Screen pipeline + nav */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 space-y-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">
              {isLive ? `${currentCat!.name} — Screen sequence` : 'Select a category on the right to begin'}
            </p>

            {/* Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {SCREENS.map((s, i) => {
                const meta   = SCREEN_META[s]
                const active = s === currentScreen && isLive
                const done   = i < currentIdx && isLive

                return (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap ${
                        active ? 'font-semibold' :
                        done   ? 'text-white/25 border-white/[0.06]' :
                                 'text-white/20 border-white/[0.04]'
                      }`}
                      style={active ? { borderColor: meta.color + '55', backgroundColor: meta.color + '18', color: meta.color } : {}}
                    >
                      {meta.icon} {meta.label}
                    </div>
                    {i < SCREENS.length - 1 && (
                      <div className={`w-3 h-px ${done ? 'bg-white/15' : 'bg-white/[0.05]'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Nav buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => void advance('prev')}
                disabled={busy || !isLive}
                className="w-24 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/50 hover:text-white disabled:opacity-20 transition-all active:scale-[0.97] text-sm"
              >
                ◀ Prev
              </button>

              <button
                onClick={() => void advance('next')}
                disabled={busy || !isLive}
                className="flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-20"
                style={isLive && !busy
                  ? { borderColor: SCREEN_META[nextScreen].color + '55', backgroundColor: SCREEN_META[nextScreen].color + '15', color: SCREEN_META[nextScreen].color }
                  : { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.2)' }
                }
              >
                {busy
                  ? <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : `Next: ${SCREEN_META[nextScreen].icon} ${SCREEN_META[nextScreen].label} ▶`
                }
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-red-400 text-sm flex items-center gap-1.5 px-1">
              ⚠ {errorMsg}
            </p>
          )}
        </div>

        {/* Right: Category list */}
        <div className="w-72 flex-shrink-0 border-l border-white/[0.07] flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.05]">
            <p className="text-white/35 text-[10px] uppercase tracking-[0.3em] font-semibold">Categories</p>
            <p className="text-white/20 text-xs mt-0.5">
              {categories.length === 0 ? 'No categories found' : `${categories.length} available — click to go live`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
            {categories.map((cat) => {
              const active = cat.id === displayState?.current_category_id
              return (
                <button
                  key={cat.id}
                  onClick={() => void jumpTo(cat.id)}
                  disabled={busy}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all group disabled:opacity-40 ${
                    active
                      ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 flex-shrink-0 rounded-full transition-colors ${
                      active ? 'bg-[#C9A84C] animate-pulse' : 'bg-white/10 group-hover:bg-white/25'
                    }`} aria-hidden />
                    <span className={`text-sm font-medium truncate flex-1 ${
                      active ? 'text-[#C9A84C]' : 'text-white/60 group-hover:text-white'
                    }`}>
                      {cat.name}
                    </span>
                    {active
                      ? <span className="flex-shrink-0 text-[10px] text-[#C9A84C]/60 font-bold uppercase tracking-wider">Live</span>
                      : <span className="flex-shrink-0 text-[10px] text-white/15 group-hover:text-white/35 transition-colors">Go live ▶</span>
                    }
                  </div>
                  {active && (
                    <p className="mt-1.5 pl-4 text-[11px] text-white/30">
                      {SCREEN_META[currentScreen].icon} {SCREEN_META[currentScreen].label}
                    </p>
                  )}
                </button>
              )
            })}

            {categories.length === 0 && (
              <div className="py-10 text-center space-y-1">
                <p className="text-white/25 text-sm">No categories yet</p>
                <p className="text-white/15 text-xs">Add categories in the admin panel first</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-3 border-t border-white/[0.05]">
            <button
              onClick={() => void standby()}
              disabled={busy || !isLive}
              className="w-full py-2 rounded-xl border border-white/[0.07] text-white/25 text-xs hover:text-white/55 hover:border-white/20 disabled:opacity-20 transition-all"
            >
              ◼ Return to Standby
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
