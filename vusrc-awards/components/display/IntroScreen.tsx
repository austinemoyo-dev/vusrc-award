'use client'

import { motion } from 'framer-motion'
import type { DisplayCategory } from '@/lib/display/data'
import Image from 'next/image'

interface Props {
  category: DisplayCategory | null
}

export function IntroScreen({ category }: Props) {
  const year = new Date().getFullYear()

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Banner background */}
      {category?.banner_url ? (
        <Image
          src={category.banner_url}
          alt=""
          fill
          unoptimized
          className="object-cover scale-105"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1206] via-[#03110D] to-[#0d0d0d]" />
      )}

      {/* Overlay stack */}
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(201,168,76,0.18) 0%, transparent 65%)' }} />
      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,8,8,0.9) 100%)' }} />
      {/* Gold shimmer line at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-16 max-w-5xl w-full">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-gold/60 text-sm uppercase tracking-[0.5em] font-semibold mb-7"
        >
          VUSRC Awards {year} — Student Week
        </motion.p>

        {/* Category name — the big moment */}
        <motion.h1
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif font-black text-foreground leading-[0.88] tracking-tight"
          style={{
            fontSize: 'clamp(4rem, 10vw, 9rem)',
            textShadow: '0 0 80px rgba(201,168,76,0.3)',
          }}
        >
          {category?.name ?? 'Category'}
        </motion.h1>

        {/* Gold rule */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-8 w-20 h-px bg-gradient-to-r from-transparent via-gold to-transparent origin-center"
        />

        {/* Description */}
        {category?.description && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="mt-6 text-foreground/55 leading-relaxed max-w-2xl"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}
          >
            {category.description}
          </motion.p>
        )}

        {/* "Coming up" badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="mt-10 flex items-center gap-3"
        >
          <div className="w-10 h-px bg-gold/35" />
          <span className="text-gold/50 text-xs uppercase tracking-[0.35em] font-medium">
            Nominee Parade
          </span>
          <div className="w-10 h-px bg-gold/35" />
        </motion.div>
      </div>

      {/* Corner watermark */}
      <p className="absolute bottom-7 right-10 text-foreground/15 text-xs tracking-[0.3em] uppercase">
        Vision University
      </p>

      {/* VUSRC badge top-left */}
      <div className="absolute top-7 left-10 flex items-center gap-2.5 opacity-30">
        <div className="w-7 h-7 rounded-lg border border-gold/50 flex items-center justify-center">
          <span className="font-serif font-black text-gold text-sm leading-none">V</span>
        </div>
        <span className="font-serif font-black text-gold text-sm tracking-wider">VUSRC</span>
      </div>
    </div>
  )
}
