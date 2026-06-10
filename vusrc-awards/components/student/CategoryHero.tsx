'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Props {
  name: string
  description: string | null
  bannerUrl: string | null
  dayNumber: number | null
  isVotingOpen: boolean
  closesAt: string | null
  nomineeCount: number
}

export function CategoryHero({
  name,
  description,
  bannerUrl,
  dayNumber,
  isVotingOpen,
  closesAt,
  nomineeCount,
}: Props) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const scrollTargetRef = useRef<HTMLDivElement>(null)

  async function handleLogout() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  function scrollToNominees() {
    scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Parallax on the background image while scrolling
  const heroRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    function onScroll() {
      const y = window.scrollY
      const bg = el!.querySelector<HTMLElement>('[data-parallax]')
      if (bg) bg.style.transform = `translateY(${y * 0.3}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closesFormatted = closesAt
    ? new Date(closesAt).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      {/* ── Cinematic hero ─────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden">

        {/* Background layer */}
        <div data-parallax className="absolute inset-0 scale-110 origin-top">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1206] via-[#0e0c06] to-[#03110D]" />
          )}
        </div>

        {/* Overlay stack — creates depth */}
        {/* Heavy vignette all edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,8,8,0.85)_100%)]" />
        {/* Bottom darkens to page bg so content blends in */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#03110D] via-[#03110D]/40 to-transparent" />
        {/* Top bar safe area */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#03110D]/70 to-transparent" />
        {/* Subtle gold accent at center-bottom */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        {/* Top bar: back link + logout */}
        <div className="relative z-10 px-5 sm:px-8 pt-6 flex items-center justify-between gap-4">
          <Link
            href="/vote"
            className="inline-flex items-center gap-1.5 text-white/50 text-sm hover:text-white/80 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All categories
          </Link>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/35 hover:text-white/70 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Sign out"
          >
            {signingOut ? (
              <span className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" aria-hidden />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Centre content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-8 text-center py-20">

          {/* Day badge */}
          {dayNumber != null && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-5"
            >
              <span className="inline-block border border-gold/30 text-gold/70 text-[11px] font-semibold tracking-[0.2em] uppercase rounded-full px-4 py-1.5">
                Day {dayNumber}
              </span>
            </motion.div>
          )}

          {/* Category name — the star of the show */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif font-black text-foreground leading-[0.9] tracking-tight max-w-3xl"
            style={{ fontSize: 'clamp(2.8rem, 9vw, 7rem)' }}
          >
            {name}
          </motion.h1>

          {/* Decorative gold rule under name */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-6 w-16 h-px bg-gold/50 origin-center"
          />

          {/* Description */}
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-5 text-white/60 text-base sm:text-lg leading-relaxed max-w-xl"
            >
              {description}
            </motion.p>
          )}

          {/* Status pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.05 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
          >
            {isVotingOpen ? (
              <span className="inline-flex items-center gap-1.5 bg-gold/15 border border-gold/30 text-gold text-xs font-semibold rounded-full px-3.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" aria-hidden />
                Voting Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/40 text-xs rounded-full px-3.5 py-1.5">
                Voting Closed
              </span>
            )}

            {closesFormatted && isVotingOpen && (
              <span className="text-white/35 text-xs">
                Closes {closesFormatted}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/50 text-xs rounded-full px-3.5 py-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {nomineeCount} {nomineeCount === 1 ? 'nominee' : 'nominees'}
            </span>
          </motion.div>
        </div>

        {/* Scroll CTA — bottom centre */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="relative z-10 flex flex-col items-center gap-2 pb-10 cursor-pointer"
          onClick={scrollToNominees}
          role="button"
          tabIndex={0}
          aria-label="Scroll to nominees"
          onKeyDown={(e) => e.key === 'Enter' && scrollToNominees()}
        >
          <span className="text-white/35 text-xs tracking-[0.18em] uppercase font-medium">
            Meet the nominees
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-gold/50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Scroll anchor ──────────────────────────────────────────────── */}
      <div ref={scrollTargetRef} />
    </>
  )
}
