'use client'

import { motion } from 'framer-motion'
import type { DisplayCategory } from '@/lib/display/data'
import Image from 'next/image'

interface Props {
  category: DisplayCategory | null
}

export function LeaderboardScreen({ category }: Props) {
  const year = new Date().getFullYear()
  const nominees = (category?.nominees ?? []).slice(0, 6) // max 6 for TV legibility
  const topVotes = nominees[0]?.total_votes ?? 1

  return (
    <div className="relative w-full h-full bg-base flex flex-col overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 60%)' }}
      />
      {/* Gold top line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="flex-shrink-0 flex items-end justify-between px-14 pt-10 pb-8"
      >
        <div>
          <p className="text-gold/50 text-sm uppercase tracking-[0.45em] mb-2 font-semibold">Final Results</p>
          <h2
            className="font-serif font-black text-foreground leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 5rem)', textShadow: '0 0 40px rgba(201,168,76,0.2)' }}
          >
            {category?.name ?? 'Category'}
          </h2>
        </div>

        {/* VUSRC badge */}
        <div className="flex items-center gap-2.5 opacity-35">
          <div className="w-8 h-8 rounded-xl border border-gold/60 flex items-center justify-center">
            <span className="font-serif font-black text-gold leading-none text-base">V</span>
          </div>
          <span className="font-serif font-black text-gold text-base tracking-wider">VUSRC</span>
        </div>
      </motion.div>

      {/* Leaderboard rows — fills remaining space, no scroll */}
      <div className="flex-1 flex flex-col gap-3 px-14 pb-10 min-h-0">
        {nominees.map((n, i) => {
          const pct = topVotes > 0 ? (n.total_votes / topVotes) * 100 : 0
          const isWinner = i === 0

          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.55, ease: 'easeOut' as const }}
              className="flex-1 flex items-center gap-5 px-6 py-0 rounded-2xl border min-h-0"
              style={{
                borderColor: isWinner ? 'rgba(201,168,76,0.3)' : 'rgba(42,42,42,0.8)',
                background: isWinner
                  ? 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 60%)'
                  : 'rgba(18,18,18,0.6)',
                boxShadow: isWinner ? '0 0 30px rgba(201,168,76,0.08)' : undefined,
              }}
            >
              {/* Rank number */}
              <div
                className="flex-shrink-0 w-10 text-center font-black font-serif"
                style={{
                  fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
                  color: isWinner ? '#C9A84C' : 'rgba(245,245,245,0.2)',
                }}
              >
                {isWinner ? '🏆' : i + 1}
              </div>

              {/* Photo */}
              <div
                className="flex-shrink-0 rounded-xl overflow-hidden"
                style={{
                  width: 'min(6vw, 60px)',
                  height: 'min(6vw, 60px)',
                  border: isWinner ? '2px solid rgba(201,168,76,0.5)' : '1px solid rgba(42,42,42,1)',
                }}
              >
                {n.photo_url ? (
                  <Image
                    src={n.photo_url}
                    alt={n.full_name}
                    width={60}
                    height={60}
                    unoptimized
                    className="object-cover object-top w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-2 flex items-center justify-center font-bold text-muted" style={{ fontSize: '1.1rem' }}>
                    {n.full_name[0]}
                  </div>
                )}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <p
                    className="font-semibold truncate"
                    style={{
                      fontSize: 'clamp(1rem, 2.2vw, 1.6rem)',
                      color: isWinner ? '#E8C96D' : '#F5F5F5',
                    }}
                  >
                    {n.full_name}
                    {isWinner && (
                      <span className="ml-3 text-xs font-semibold text-gold/60 uppercase tracking-wider align-middle">
                        Winner
                      </span>
                    )}
                  </p>
                  <p className="flex-shrink-0 tabular-nums text-foreground/45"
                    style={{ fontSize: 'clamp(0.85rem, 1.8vw, 1.3rem)' }}>
                    {n.total_votes} {n.total_votes === 1 ? 'vote' : 'votes'}
                  </p>
                </div>

                {/* Animated bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(42,42,42,0.8)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 1.1, ease: 'easeOut' as const }}
                    className="h-full rounded-full"
                    style={{
                      background: isWinner
                        ? 'linear-gradient(90deg, #C9A84C, #E8C96D, #C9A84C)'
                        : `rgba(201,168,76,${Math.max(0.2, 0.5 - i * 0.06)})`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="flex-shrink-0 pb-5 text-center text-foreground/15 text-xs tracking-[0.35em] uppercase">
        VUSRC Awards {year} — Vision University
      </p>
    </div>
  )
}
