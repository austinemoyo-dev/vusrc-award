'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayCategory } from '@/lib/display/data'
import Image from 'next/image'

interface Props {
  category: DisplayCategory | null
}

export function ParadeScreen({ category }: Props) {
  const nominees = category?.nominees ?? []
  const [idx, setIdx] = useState(0)

  useEffect(() => { setIdx(0) }, [category?.id])

  useEffect(() => {
    if (nominees.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % nominees.length), 4000)
    return () => clearInterval(t)
  }, [nominees.length])

  const nominee = nominees[idx]

  if (!nominee) {
    return (
      <div className="w-full h-full bg-base flex items-center justify-center">
        <p className="text-muted text-2xl">No nominees</p>
      </div>
    )
  }

  // Show at most 12 dots, clip to current range if more nominees
  const maxDots = 12
  const showDots = nominees.length <= maxDots

  return (
    <div className="relative w-full h-full bg-base overflow-hidden">
      {/* Ambient background glow from photo side */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 80% at 20% 50%, rgba(201,168,76,0.06) 0%, transparent 60%)' }}
      />

      {/* Gold line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 px-14 py-7 flex items-center justify-between">
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-5 h-5 rounded-md border border-gold/50 flex items-center justify-center">
            <span className="font-serif font-black text-gold text-[10px] leading-none">V</span>
          </div>
          <p className="text-gold text-xs uppercase tracking-[0.35em] font-semibold">
            {category?.name}
          </p>
        </div>
        <p className="text-foreground/25 text-sm tabular-nums">
          {idx + 1} / {nominees.length}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={nominee.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex"
        >
          {/* Left: photo — full bleed */}
          <div className="relative flex-shrink-0" style={{ width: '42%' }}>
            {nominee.photo_url ? (
              <>
                <Image
                  src={nominee.photo_url}
                  alt={nominee.full_name}
                  fill
                  unoptimized
                  className="object-cover object-top"
                />
                {/* Gradient blending right edge into dark background */}
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-base" />
                {/* Gradient darkening bottom for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-base/60 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                <span
                  className="font-serif font-black text-gold/30"
                  style={{ fontSize: 'clamp(6rem, 18vw, 16rem)' }}
                >
                  {nominee.full_name[0]}
                </span>
              </div>
            )}
          </div>

          {/* Right: name + info */}
          <div className="flex-1 flex flex-col justify-center pl-12 pr-16">
            <motion.div
              key={`info-${nominee.id}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Nominee # */}
              <p className="text-gold/40 text-sm uppercase tracking-[0.3em] mb-4 font-medium">
                Nominee {idx + 1}
              </p>

              {/* Name */}
              <h2
                className="font-serif font-black text-foreground leading-[0.92] tracking-tight"
                style={{
                  fontSize: 'clamp(3rem, 7vw, 6.5rem)',
                  textShadow: '0 0 40px rgba(201,168,76,0.15)',
                }}
              >
                {nominee.full_name}
              </h2>

              {/* Gold rule */}
              <div className="mt-6 mb-5 w-12 h-px bg-gradient-to-r from-gold/50 to-transparent" />

              {/* Department / level */}
              {(nominee.department || nominee.level) && (
                <p className="text-foreground/45" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
                  {[nominee.department, nominee.level].filter(Boolean).join('  ·  ')}
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="absolute bottom-8 inset-x-0 flex justify-center z-20">
        {showDots ? (
          <div className="flex items-center gap-2">
            {nominees.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === idx ? 28 : 6,
                  height: 6,
                  background: i === idx ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                }}
              />
            ))}
          </div>
        ) : (
          // Progress bar for many nominees
          <div className="w-48 h-1 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${((idx + 1) / nominees.length) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
