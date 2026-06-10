'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  name: string
  votedCount: number
  totalOpen: number
}

export function StudentHeader({ name, votedCount, totalOpen }: Props) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleLogout() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  const progress = totalOpen > 0 ? (votedCount / totalOpen) * 100 : 0
  const allDone = totalOpen > 0 && votedCount >= totalOpen

  return (
    <header className="sticky top-0 z-50 bg-base/90 backdrop-blur-xl border-b border-gold/[0.08]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">

        {/* Left: Logo */}
        <Link href="/vote" className="flex items-center gap-3 select-none flex-shrink-0">
          <span
            className="font-display font-light text-gold tracking-[0.35em] uppercase"
            style={{ fontSize: '1.05rem' }}
          >VUSRC</span>
        </Link>

        {/* Right: progress + greeting + logout */}
        <div className="flex items-center gap-3">

          {/* Progress indicator — visible on sm+ */}
          {totalOpen > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gold rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`text-[11px] tabular-nums font-medium ${allDone ? 'text-gold' : 'text-foreground/50'}`}>
                {votedCount}/{totalOpen}
              </span>
              {allDone && (
                <span className="text-[10px] text-gold/70 font-semibold tracking-wider uppercase">All done!</span>
              )}
            </div>
          )}

          {/* Greeting */}
          <span className="font-display font-light text-foreground/45 text-sm tracking-wide hidden md:block">
            Hi, <em style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.7)' }}>{name}</em>
          </span>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 font-sans font-light text-[10px] text-foreground/35 hover:text-foreground/70 border border-white/[0.07] hover:border-gold/25 px-3 py-1.5 tracking-[0.2em] uppercase transition-all disabled:opacity-40"
            aria-label="Sign out"
          >
            {signingOut ? (
              <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" aria-hidden />
            ) : (
              <SignOutIcon />
            )}
            <span className="hidden sm:inline">Exit</span>
          </button>

        </div>
      </div>
    </header>
  )
}

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
