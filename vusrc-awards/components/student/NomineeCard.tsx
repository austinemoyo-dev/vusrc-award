'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Nominee } from '@/types'

interface NomineeCardProps {
  nominee: Nominee
  isSelectable: boolean
  isSelected: boolean
  isMyVote: boolean
  isDimmed: boolean
  onClick: () => void
}

export function NomineeCard({
  nominee,
  isSelectable,
  isSelected,
  isMyVote,
  isDimmed,
  onClick,
}: NomineeCardProps) {
  return (
    <motion.div
      onClick={isSelectable ? onClick : undefined}
      whileHover={isSelectable ? { y: -2 } : {}}
      transition={{ duration: 0.15 }}
      className={[
        'relative rounded-xl overflow-hidden border transition-all duration-200 bg-surface',
        isSelectable ? 'cursor-pointer' : 'cursor-default',
        isSelected
          ? 'border-gold ring-2 ring-gold/40 shadow-lg shadow-gold/10'
          : 'border-border',
        isDimmed ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Portrait — 4:5 aspect */}
      <div className="relative aspect-[4/5] bg-surface-2">
        {nominee.photo_url ? (
          <Image
            src={nominee.photo_url}
            alt={nominee.full_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-4xl font-bold text-muted/30 select-none">
              {nominee.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gold check when selected */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-md">
            <CheckSvg size={11} className="text-base" />
          </div>
        )}

        {/* "Your Vote" badge */}
        {isMyVote && (
          <div className="absolute top-2 left-2 bg-gold text-base text-[10px] font-bold rounded-full px-2.5 py-0.5 shadow">
            Your Vote
          </div>
        )}

        {/* Fade-into-card bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-serif text-sm font-bold text-foreground leading-snug">
          {nominee.full_name}
        </h3>

        {(nominee.department || nominee.level) && (
          <p className="text-muted text-[11px] mt-0.5 truncate">
            {[nominee.department, nominee.level].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function CheckSvg({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
