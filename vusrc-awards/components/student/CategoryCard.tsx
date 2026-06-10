'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export interface CategoryCardData {
  id: string
  name: string
  slug: string
  description: string
  banner_url: string | null
  day_number: number | null
  is_open: boolean
  nomineeCount: number
}

interface CategoryCardProps {
  category: CategoryCardData
  hasVoted: boolean
}

// ── Locked Card ───────────────────────────────────────────────────────────────

function LockedCard({ category }: { category: CategoryCardData }) {
  return (
    <div className="relative h-64 rounded-2xl overflow-hidden border border-border bg-surface-2 flex flex-col justify-between p-5 select-none">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, #C9A84C 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.025] to-transparent" aria-hidden />

      <div className="relative flex items-start justify-between gap-2">
        {category.day_number != null && (
          <span className="inline-flex items-center border border-gold/20 text-gold/40 text-[10px] font-semibold tracking-widest uppercase rounded-full px-3 py-1">
            Day {category.day_number}
          </span>
        )}
        <div className="ml-auto flex-shrink-0 w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center">
          <LockIcon />
        </div>
      </div>

      <div className="relative">
        <h3 className="font-serif text-xl font-bold text-foreground/35 leading-snug">{category.name}</h3>
        <p className="text-muted/50 text-[11px] mt-1.5 tracking-[0.15em] uppercase font-semibold">Opens soon</p>
      </div>
    </div>
  )
}

// ── Open Card ─────────────────────────────────────────────────────────────────

function OpenCard({ category }: { category: CategoryCardData }) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(201,168,76,0.4), 0 16px 48px rgba(201,168,76,0.18)' }}
      transition={{ duration: 0.22 }}
      className="group relative h-64 rounded-2xl overflow-hidden border border-gold/25 bg-surface-2 flex flex-col"
    >
      {/* Banner / background */}
      {category.banner_url ? (
        <Image
          src={category.banner_url}
          alt={category.name}
          fill
          className="object-cover opacity-25 group-hover:opacity-40 transition-opacity duration-400"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-[#3d2a00]/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/65 to-transparent" />

      {/* Gold shimmer line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />

      <div className="relative flex flex-col h-full justify-between p-5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span className="bg-gold/15 border border-gold/25 text-gold text-[10px] font-bold tracking-wider uppercase rounded-full px-3 py-1">
            {category.nomineeCount} {category.nomineeCount === 1 ? 'Nominee' : 'Nominees'}
          </span>
          {category.day_number != null && (
            <span className="text-white/30 text-[10px] tracking-widest uppercase">Day {category.day_number}</span>
          )}
          {/* Pulsing open indicator */}
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gold animate-pulse" aria-label="Voting open" />
        </div>

        {/* Bottom */}
        <div>
          <h3 className="font-serif text-xl font-bold text-foreground leading-snug mb-1">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-muted text-xs leading-relaxed line-clamp-2 mb-3">
              {category.description}
            </p>
          )}
          <Link
            href={`/vote/${category.slug}`}
            className="flex items-center justify-center gap-2 bg-gold hover:bg-[#d4b558] active:bg-[#b8943f] text-[#03110D] text-xs font-bold rounded-xl px-4 py-2.5 transition-all group-hover:shadow-[0_4px_24px_rgba(201,168,76,0.4)]"
          >
            Vote Now
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ── Voted Card ────────────────────────────────────────────────────────────────

function VotedCard({ category }: { category: CategoryCardData }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative h-64 rounded-2xl overflow-hidden border border-success/20 bg-surface-2 flex flex-col"
    >
      {/* Banner */}
      {category.banner_url ? (
        <Image
          src={category.banner_url}
          alt={category.name}
          fill
          className="object-cover opacity-15"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-success/8 to-transparent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/70 to-transparent" />

      {/* Success shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success/40 to-transparent" aria-hidden />

      <div className="relative flex flex-col h-full justify-between p-5">
        {/* Vote cast badge */}
        <div className="self-start">
          <span className="inline-flex items-center gap-1.5 bg-success/10 border border-success/25 text-success text-[10px] font-bold rounded-full px-3 py-1.5">
            <CheckCircleIcon />
            Vote Cast
          </span>
        </div>

        <div>
          <h3 className="font-serif text-xl font-bold text-foreground/65 leading-snug mb-1">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-muted/70 text-xs leading-relaxed line-clamp-2 mb-3">
              {category.description}
            </p>
          )}
          <Link
            href={`/vote/${category.slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-foreground transition-colors"
          >
            Review nominees <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CategoryCard({ category, hasVoted }: CategoryCardProps) {
  if (!category.is_open) return <LockedCard category={category} />
  if (hasVoted)          return <VotedCard  category={category} />
  return                        <OpenCard   category={category} />
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className="text-muted/50" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
