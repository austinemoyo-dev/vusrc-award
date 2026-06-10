'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeToDisplayState } from '@/lib/realtime/display'
import type { DisplayState } from '@/types'
import type { DisplayCategory } from '@/lib/display/data'
import { IntroScreen } from '@/components/display/IntroScreen'
import { ParadeScreen } from '@/components/display/ParadeScreen'
import { DrumrollScreen } from '@/components/display/DrumrollScreen'
import { RevealScreen } from '@/components/display/RevealScreen'
import { LeaderboardScreen } from '@/components/display/LeaderboardScreen'

export default function DisplayPage() {
  const [displayState, setDisplayState] = useState<DisplayState | null>(null)
  const [category, setCategory] = useState<DisplayCategory | null>(null)
  const [ready, setReady] = useState(false)

  // Full-screen: hide overflow + cursor
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.cursor = 'none'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.body.style.cursor = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToDisplayState((state) => setDisplayState(state))
    return () => void channel.unsubscribe()
  }, [])

  // Fetch initial state + poll every 3s as fallback for when realtime isn't configured
  useEffect(() => {
    let cancelled = false

    async function fetchState() {
      try {
        const res = await fetch('/api/display/state', { cache: 'no-store' })
        if (res.ok && !cancelled) {
          const state: DisplayState = await res.json()
          setDisplayState(state)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void fetchState()

    const interval = setInterval(() => { void fetchState() }, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  // Fetch category data when category ID changes
  const fetchCategory = useCallback(async (categoryId: string) => {
    try {
      const res = await fetch(`/api/display/category/${categoryId}`)
      if (res.ok) {
        const data: DisplayCategory = await res.json()
        setCategory(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (displayState?.current_category_id) {
      void fetchCategory(displayState.current_category_id)
    }
  }, [displayState?.current_category_id, fetchCategory])

  if (!ready) {
    return <StandbyScreen loading />
  }

  // Standby screen — no active category yet
  if (!displayState?.current_category_id) {
    return <StandbyScreen loading={false} />
  }

  const screenKey = `${displayState.current_category_id}-${displayState.current_screen}`

  function renderScreen() {
    const screen = displayState!.current_screen
    if (screen === 'intro') return <IntroScreen category={category} />
    if (screen === 'parade') return <ParadeScreen category={category} />
    if (screen === 'drumroll') return <DrumrollScreen />
    if (screen === 'reveal') return <RevealScreen category={category} />
    if (screen === 'leaderboard') return <LeaderboardScreen category={category} />
    return null
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-base">
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Standby screen ────────────────────────────────────────────────────────────

function StandbyScreen({ loading }: { loading: boolean }) {
  const year = new Date().getFullYear()
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + i * 5.2}%`,
    size: 2 + (i % 4),
    delay: `${(i * 0.38).toFixed(2)}s`,
    duration: `${5 + (i % 5)}s`,
    opacity: 0.12 + (i % 3) * 0.1,
  }))

  return (
    <div className="relative w-screen h-screen bg-base flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes rise {
          0%   { transform: translateY(0) scale(1);    opacity: var(--op); }
          100% { transform: translateY(-95vh) scale(0.3); opacity: 0; }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.15; transform: scale(1);    }
          50%       { opacity: 0.35; transform: scale(1.04); }
        }
      `}</style>

      {/* Floating gold particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gold"
          style={{
            left: p.left,
            bottom: '5%',
            width: p.size,
            height: p.size,
            '--op': p.opacity,
            animation: `rise ${p.duration} ${p.delay} ease-in infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Outer rings */}
      <div className="absolute" style={{ width: 480, height: 480, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)', animation: 'pulse-ring 4s ease-in-out infinite' }} />
      <div className="absolute" style={{ width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.18)', animation: 'pulse-ring 4s 0.6s ease-in-out infinite' }} />
      <div className="absolute" style={{ width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.25)', animation: 'pulse-ring 4s 1.2s ease-in-out infinite' }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' as const }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-gold/10 border-2 border-gold/25 flex items-center justify-center"
          style={{ boxShadow: '0 0 60px rgba(201,168,76,0.15)' }}>
          <span className="font-serif font-black text-gold text-5xl leading-none">V</span>
        </div>

        <div className="text-center">
          <p className="font-serif font-black text-gold text-3xl tracking-[0.25em] uppercase">VUSRC</p>
          <p className="text-gold/40 text-sm tracking-[0.4em] uppercase mt-1">
            Awards {year}
          </p>
        </div>

        <motion.div
          className="w-16 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
          animate={{ scaleX: [0.6, 1.2, 0.6], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' as const }}
        />

        <motion.p
          animate={{ opacity: [0.25, 0.65, 0.25] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' as const }}
          className="text-gold/50 text-xs uppercase tracking-[0.5em]"
        >
          {loading ? 'Loading…' : 'Awaiting signal'}
        </motion.p>
      </motion.div>

      {/* Bottom watermark */}
      <p className="absolute bottom-8 text-foreground/15 text-xs tracking-[0.35em] uppercase">
        Vision University · Student Week
      </p>
    </div>
  )
}
