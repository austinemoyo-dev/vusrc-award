'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { DisplayCategory } from '@/lib/display/data'
import Image from 'next/image'
import confetti from 'canvas-confetti'

interface Props {
  category: DisplayCategory | null
}

function fireConfetti() {
  const gold  = '#C9A84C'
  const light = '#E8C96D'
  const white = '#F5F5F5'

  const burst = (origin: { x: number; y: number }, angle: number, count = 80) =>
    confetti({ particleCount: count, angle, spread: 70, origin, colors: [gold, light, white, '#8B6914'], startVelocity: 55, gravity: 0.8, scalar: 1.15 })

  // Corners
  burst({ x: 0,   y: 0.65 }, 60)
  setTimeout(() => burst({ x: 1,   y: 0.65 }, 120), 180)
  // Centre blast
  setTimeout(() =>
    confetti({ particleCount: 160, spread: 120, origin: { x: 0.5, y: 0.25 }, colors: [gold, light, white], startVelocity: 50 }),
    450
  )
  // Second wave
  setTimeout(() => burst({ x: 0.15, y: 0.5 }, 80, 60), 900)
  setTimeout(() => burst({ x: 0.85, y: 0.5 }, 100, 60), 1050)
}

export function RevealScreen({ category }: Props) {
  const winner = category?.nominees[0] ?? null

  useEffect(() => {
    if (!winner) return
    const t = setTimeout(fireConfetti, 700)
    return () => clearTimeout(t)
  }, [winner?.id])

  if (!winner) {
    return (
      <div className="w-full h-full bg-base flex items-center justify-center">
        <p className="text-muted text-2xl">No winner data</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-base flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes winner-glow {
          0%, 100% { box-shadow: 0 0 60px rgba(201,168,76,0.5), 0 0 120px rgba(201,168,76,0.2); }
          50%       { box-shadow: 0 0 120px rgba(201,168,76,0.85), 0 0 220px rgba(201,168,76,0.4); }
        }
      `}</style>

      {/* Background radial glow */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 65% 65% at 50% 45%, rgba(201,168,76,0.1) 0%, transparent 65%)' }} />

      {/* Gold shimmer lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Category label */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-6 flex items-center gap-3"
      >
        <div className="w-8 h-px bg-gold/40" />
        <p className="text-gold/70 text-sm uppercase tracking-[0.4em] font-semibold">
          {category?.name}
        </p>
        <div className="w-8 h-px bg-gold/40" />
      </motion.div>

      {/* Photo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{
          width: 'min(34vw, 320px)',
          aspectRatio: '3/4',
          border: '2px solid rgba(201,168,76,0.5)',
          animation: 'winner-glow 2s ease-in-out infinite alternate',
        }}
      >
        {winner.photo_url ? (
          <Image
            src={winner.photo_url}
            alt={winner.full_name}
            fill
            unoptimized
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-surface-2 flex items-center justify-center">
            <span className="font-serif font-black text-gold" style={{ fontSize: 'clamp(4rem, 12vw, 9rem)' }}>
              {winner.full_name[0]}
            </span>
          </div>
        )}
      </motion.div>

      {/* WINNER badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.5, type: 'spring', stiffness: 300 }}
        className="relative z-10 mt-6 px-6 py-2 border border-gold/40 rounded-full bg-gold/10"
        style={{ boxShadow: '0 0 30px rgba(201,168,76,0.25)' }}
      >
        <span className="text-gold text-xs font-bold uppercase tracking-[0.45em]">🏆 Winner</span>
      </motion.div>

      {/* Winner name */}
      <motion.h1
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mt-5 font-serif font-black text-foreground text-center leading-[0.9] tracking-tight"
        style={{
          fontSize: 'clamp(3rem, 8vw, 7.5rem)',
          textShadow: '0 0 60px rgba(201,168,76,0.5)',
        }}
      >
        {winner.full_name}
      </motion.h1>

      {/* Department / level */}
      {(winner.department || winner.level) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="relative z-10 mt-3 text-foreground/45"
          style={{ fontSize: 'clamp(1rem, 2.2vw, 1.5rem)' }}
        >
          {[winner.department, winner.level].filter(Boolean).join('  ·  ')}
        </motion.p>
      )}

      {/* Gold rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.3, duration: 0.7, ease: 'easeOut' as const }}
        className="relative z-10 mt-7 h-px w-52 bg-gradient-to-r from-transparent via-gold to-transparent origin-center"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.7 }}
        className="relative z-10 mt-4 text-gold/55 text-base uppercase tracking-[0.45em] font-medium"
      >
        Congratulations
      </motion.p>

      {/* Corner watermarks */}
      <p className="absolute bottom-7 right-10 text-foreground/15 text-xs tracking-[0.3em] uppercase">Vision University</p>
      <div className="absolute top-7 left-10 flex items-center gap-2 opacity-25">
        <div className="w-6 h-6 rounded-lg border border-gold/60 flex items-center justify-center">
          <span className="font-serif font-black text-gold text-xs leading-none">V</span>
        </div>
        <span className="font-serif font-black text-gold text-xs tracking-wider">VUSRC</span>
      </div>
    </div>
  )
}
