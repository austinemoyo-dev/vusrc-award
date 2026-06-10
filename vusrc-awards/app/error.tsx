'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#03110D] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-px h-16 bg-gradient-to-b from-transparent to-red-500/50 mb-10" />

      <p className="text-red-400 text-xs font-semibold tracking-[0.3em] uppercase mb-4">
        Something went wrong
      </p>

      <h1
        className="text-2xl sm:text-3xl font-semibold text-white mb-3"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        An unexpected error occurred
      </h1>

      <p className="text-white/40 text-sm max-w-sm leading-relaxed mb-2">
        {error.message || 'An unknown error occurred. Please try again.'}
      </p>

      {error.digest && (
        <p className="text-white/20 text-xs font-mono mb-8">
          Error ID: {error.digest}
        </p>
      )}

      {!error.digest && <div className="mb-8" />}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943f] active:bg-[#a07c34] text-[#03110D] font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 font-medium text-sm px-6 py-3 rounded-xl border border-white/10 transition-colors"
        >
          Go home
        </a>
      </div>

      <div className="w-px h-16 bg-gradient-to-b from-red-500/50 to-transparent mt-10" />

      <p className="text-white/15 text-xs tracking-widest mt-2">
        VUSRC · Student Week Awards
      </p>
      <p className="text-white/8 text-[10px] tracking-[0.3em] uppercase mt-1">
        Crafted by <span className="text-[#C9A84C]/25">Dash &amp; Co.</span>
      </p>
    </div>
  )
}
