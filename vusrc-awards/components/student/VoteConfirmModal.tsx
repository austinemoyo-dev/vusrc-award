'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Nominee } from '@/types'

interface VoteConfirmModalProps {
  nominee: Nominee
  categoryName: string
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}

export function VoteConfirmModal({
  nominee,
  categoryName,
  onConfirm,
  onCancel,
  submitting,
}: VoteConfirmModalProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        aria-hidden
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 380 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none"
      >
        <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm pointer-events-auto shadow-2xl">

          {/* Nominee identity row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-14 h-[72px] rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
              {nominee.photo_url ? (
                <Image
                  src={nominee.photo_url}
                  alt={nominee.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-serif text-xl font-bold text-muted/30 select-none">
                    {nominee.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted uppercase tracking-widest mb-0.5 truncate">
                {categoryName}
              </p>
              <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                {nominee.full_name}
              </h3>
              {(nominee.department || nominee.level) && (
                <p className="text-muted text-xs mt-0.5 truncate">
                  {[nominee.department, nominee.level].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Warning notice */}
          <div className="bg-gold/5 border border-gold/15 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-sm text-foreground/80 leading-relaxed">
              Votes are final and{' '}
              <span className="text-gold font-semibold">cannot be changed</span>.
            </p>
            <p className="text-[11px] text-muted mt-1">
              Are you sure you want to vote for this person?
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 border border-border text-muted hover:text-foreground hover:border-muted/60 transition-colors rounded-xl py-3 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-60 text-base font-bold rounded-xl py-3 text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Confirm Vote'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
