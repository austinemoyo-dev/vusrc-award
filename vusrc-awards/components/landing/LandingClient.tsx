'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { CountdownTimer } from '@/components/ui/countdown-timer'

interface Props {
  ctaHref: string
  votingOpens: string
  year: number
}

// Roman numeral helper
function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]!) { result += syms[i]; n -= vals[i]! }
  }
  return result
}

// Floating particle
function Particle({ x, delay, duration, size, opacity }: {
  x: string; delay: number; duration: number; size: number; opacity: number
}) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full bg-gold pointer-events-none"
      style={{ left: x, width: size, height: size, opacity: 0 }}
      animate={{ y: [0, -600], opacity: [0, opacity, 0] }}
      transition={{ delay, duration, repeat: Infinity, ease: 'easeIn' }}
    />
  )
}

export function LandingClient({ ctaHref, votingOpens, year }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60])

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const romanYear = toRoman(year)

  const particles = [
    { x: '8%', delay: 0, duration: 8, size: 2, opacity: 0.25 },
    { x: '18%', delay: 1.5, duration: 11, size: 1, opacity: 0.15 },
    { x: '28%', delay: 3, duration: 9, size: 3, opacity: 0.2 },
    { x: '42%', delay: 0.8, duration: 13, size: 1, opacity: 0.18 },
    { x: '55%', delay: 2.2, duration: 10, size: 2, opacity: 0.22 },
    { x: '67%', delay: 4.1, duration: 8, size: 1, opacity: 0.14 },
    { x: '75%', delay: 1.1, duration: 12, size: 2, opacity: 0.2 },
    { x: '85%', delay: 3.5, duration: 9, size: 3, opacity: 0.16 },
    { x: '92%', delay: 0.4, duration: 11, size: 1, opacity: 0.2 },
  ]

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-base text-foreground overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Deep radial glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ background: 'radial-gradient(ellipse 80% 65% at 50% 55%, rgba(201,168,76,0.07) 0%, rgba(22,48,43,0.15) 50%, transparent 75%)' }}
        />

        {/* Subtle vignette edges */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(3,17,13,0.9) 100%)' }}
        />

        {/* Floating gold particles */}
        <AnimatePresence>
          {mounted && particles.map((p, i) => <Particle key={i} {...p} />)}
        </AnimatePresence>

        {/* Slow-breathing horizontal rule above */}
        <motion.div
          className="absolute top-[15%] inset-x-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <motion.div
            className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '65%', opacity: 1 }}
            transition={{ duration: 2.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* Main content */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 flex flex-col items-center text-center px-6 select-none"
        >
          {/* Roman year — very small, widely tracked */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-gold/40 text-[10px] tracking-[0.6em] uppercase mb-8 font-sans font-light"
          >
            {romanYear} &ensp;·&ensp; Vision University
          </motion.p>

          {/* VUSRC — the centrepiece */}
          <motion.h1
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-light text-foreground leading-none tracking-[0.35em] uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 14vw, 11rem)',
              textShadow: '0 0 120px rgba(201,168,76,0.12)',
            }}
          >
            VUSRC
          </motion.h1>

          {/* Hairline gold rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="my-5 h-px origin-center"
            style={{
              width: 'clamp(120px, 30vw, 320px)',
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.7) 30%, rgba(201,168,76,0.9) 50%, rgba(201,168,76,0.7) 70%, transparent)',
            }}
            aria-hidden
          />

          {/* AWARDS subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="font-display font-light text-gold/80 tracking-[0.55em] uppercase"
            style={{ fontSize: 'clamp(1rem, 3.5vw, 2rem)', letterSpacing: '0.5em' }}
          >
            Awards &nbsp;&nbsp; {year}
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.3 }}
            className="mt-8 font-sans font-light text-foreground/30 tracking-[0.25em] uppercase text-[11px]"
          >
            Celebrating Excellence in Student Life
          </motion.p>

          {/* Countdown */}
          {votingOpens && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="mt-10 flex flex-col items-center gap-3"
            >
              <p className="text-[10px] text-muted/50 uppercase tracking-[0.4em]">Voting Opens In</p>
              <CountdownTimer targetDate={votingOpens} />
            </motion.div>
          )}

          {/* CTA — understated luxury style */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: votingOpens ? 1.8 : 1.5 }}
            className="mt-10"
          >
            <Link
              href={ctaHref}
              className="group relative inline-flex items-center gap-4 border border-gold/35 hover:border-gold/70 px-10 py-4 transition-all duration-500"
              style={{ letterSpacing: '0.3em' }}
            >
              {/* Hover fill */}
              <span className="absolute inset-0 bg-gold/0 group-hover:bg-gold/[0.06] transition-all duration-500" aria-hidden />
              <span className="relative font-display font-light text-gold text-sm uppercase tracking-[0.35em]">
                Enter
              </span>
              <span className="relative text-gold/50 group-hover:text-gold group-hover:translate-x-1 transition-all duration-300 text-xs" aria-hidden>
                →
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Slow-breathing horizontal rule below */}
        <motion.div
          className="absolute bottom-[15%] inset-x-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <motion.div
            className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '50%', opacity: 1 }}
            transition={{ duration: 2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="w-px h-10 bg-gradient-to-b from-gold/50 to-transparent"
            aria-hidden
          />
        </motion.div>
      </section>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <ScrollReveal>
        <section className="relative py-28 px-6">
          {/* Side rules */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-gold/20 to-transparent hidden lg:block" aria-hidden />
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-gold/20 to-transparent hidden lg:block" aria-hidden />

          <div className="max-w-2xl mx-auto text-center">
            <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-8">
              The Awards
            </p>

            <h2
              className="font-display font-light text-foreground/90 leading-[1.2]"
              style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)' }}
            >
              A Week That Honours<br />
              <em className="text-gold/80 not-italic" style={{ fontStyle: 'italic' }}>the Exceptional</em>
            </h2>

            <div className="flex items-center justify-center gap-6 my-8" aria-hidden>
              <div className="flex-1 max-w-[100px] h-px bg-gradient-to-r from-transparent to-gold/30" />
              <div className="w-1.5 h-1.5 rotate-45 bg-gold/40" />
              <div className="flex-1 max-w-[100px] h-px bg-gradient-to-l from-transparent to-gold/30" />
            </div>

            <p className="font-sans font-light text-foreground/40 leading-[1.9] text-sm tracking-wide">
              The VUSRC Awards celebrate the outstanding contributions of Vision University
              students to academics, leadership, social impact, and campus life.
              Categories are released across the week, and every registered student
              receives one vote per category.
            </p>

            <p className="font-sans font-light text-foreground/25 text-sm mt-5 leading-[1.9] tracking-wide">
              Nominees were selected by the Student Representative Council.
              Results are revealed live at the gala and award night.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ── PILLARS ──────────────────────────────────────────────────────── */}
      <ScrollReveal>
        <section className="py-16 px-6 border-t border-border/50">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/30">
            {[
              { num: 'I', title: 'Excellence', body: 'Honouring the highest standards in every field of campus life.' },
              { num: 'II', title: 'Community', body: 'Celebrating the bonds that make Vision University unforgettable.' },
              { num: 'III', title: 'Legacy', body: 'Your vote writes the chapter that will define this generation.' },
            ].map((p) => (
              <div key={p.num} className="bg-base px-8 py-10 flex flex-col gap-4 group hover:bg-surface transition-colors duration-500">
                <span className="font-display font-light text-gold/30 text-sm tracking-[0.4em]">{p.num}</span>
                <h3 className="font-display font-light text-foreground/80 tracking-[0.2em] uppercase text-lg">{p.title}</h3>
                <div className="w-6 h-px bg-gold/25 group-hover:w-12 transition-all duration-500" aria-hidden />
                <p className="font-sans font-light text-foreground/35 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ── ENTER CTA STRIP ──────────────────────────────────────────────── */}
      <ScrollReveal>
        <section className="py-24 px-6 text-center border-t border-border/30">
          <motion.p
            className="font-sans font-light text-[10px] text-gold/35 tracking-[0.55em] uppercase mb-8"
          >
            Cast Your Vote
          </motion.p>
          <h2
            className="font-display font-light text-foreground/70 mb-10"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', letterSpacing: '0.08em' }}
          >
            Your Voice. <em style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.7)' }}>Their Legacy.</em>
          </h2>
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-4 border border-gold/30 hover:border-gold/60 px-12 py-4 transition-all duration-500"
            style={{ letterSpacing: '0.3em' }}
          >
            <span className="absolute inset-0 bg-gold/0 group-hover:bg-gold/[0.05] transition-all duration-500" />
            <span className="font-display font-light text-gold/70 group-hover:text-gold text-sm uppercase tracking-[0.4em] transition-colors duration-300">
              Begin Voting
            </span>
            <span className="text-gold/30 group-hover:text-gold/70 group-hover:translate-x-1 transition-all duration-300 text-xs" aria-hidden>→</span>
          </Link>
        </section>
      </ScrollReveal>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-border/30 text-center">
        <div className="flex items-center justify-center gap-4 mb-4" aria-hidden>
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-gold/20" />
          <div className="w-1 h-1 rotate-45 bg-gold/30" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-gold/20" />
        </div>
        <p className="font-sans font-light text-[10px] text-foreground/20 tracking-[0.4em] uppercase">
          VUSRC &nbsp;·&nbsp; Vision University &nbsp;·&nbsp; {toRoman(year)}
        </p>
        <p className="font-sans font-light text-[9px] text-foreground/12 tracking-[0.3em] uppercase mt-2">
          Crafted by &nbsp;<span className="text-gold/30">Dash &amp; Co.</span>
        </p>
      </footer>
    </div>
  )
}

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────

function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
