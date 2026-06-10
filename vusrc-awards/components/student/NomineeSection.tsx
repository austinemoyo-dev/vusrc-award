'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { Nominee } from '@/types'
import { NomineeCard } from './NomineeCard'
import { VoteConfirmModal } from './VoteConfirmModal'

interface NomineeSectionProps {
  categoryId: string
  categoryName: string
  nominees: Nominee[]
  existingVoteNomineeId: string | null
  isVotingOpen: boolean
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } } as const
const cardItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
} as const

export function NomineeSection({
  categoryId,
  categoryName,
  nominees,
  existingVoteNomineeId,
  isVotingOpen,
}: NomineeSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [votedNomineeId, setVotedNomineeId] = useState<string | null>(existingVoteNomineeId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasVoted = votedNomineeId !== null
  const canSelect = isVotingOpen && !hasVoted
  const selectedNominee = nominees.find((n) => n.id === selectedId) ?? null

  function handleCardClick(nomineeId: string) {
    if (!canSelect) return
    setSelectedId((prev) => (prev === nomineeId ? null : nomineeId))
  }

  async function handleConfirmVote() {
    if (!selectedId) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomineeId: selectedId, categoryId }),
      })
      const data: { success?: boolean; error?: string } = await res.json()

      if (!res.ok) {
        setError(
          data.error === 'already_voted'
            ? 'You have already voted in this category.'
            : (data.error ?? 'Vote failed. Please try again.')
        )
        setShowModal(false)
        return
      }

      setVotedNomineeId(selectedId)
      setSelectedId(null)
      setShowModal(false)
      fireConfetti()
    } catch {
      setError('Network error. Please check your connection and try again.')
      setShowModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status lines */}
      {canSelect && (
        <p className="text-muted text-sm mb-6">
          Select a nominee then confirm your vote below.
        </p>
      )}
      {!isVotingOpen && !hasVoted && (
        <p className="text-muted/60 text-sm mb-6">
          Voting is not currently open for this category.
        </p>
      )}

      {/* Vote-confirmed banner */}
      <AnimatePresence>
        {hasVoted && (
          <motion.div
            key="voted"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-center gap-2.5 p-4 border border-success/20 bg-success/5 rounded-xl"
          >
            <CheckCircleIcon />
            <p className="text-success font-semibold text-sm">Your vote has been cast</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid — pb-28 so content clears the sticky button */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-28"
      >
        {nominees.map((nominee) => (
          <motion.div key={nominee.id} variants={cardItem}>
            <NomineeCard
              nominee={nominee}
              isSelectable={canSelect}
              isSelected={selectedId === nominee.id}
              isMyVote={votedNomineeId === nominee.id}
              isDimmed={hasVoted && votedNomineeId !== nominee.id}
              onClick={() => handleCardClick(nominee.id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Sticky "Confirm Vote" button — slides up when a nominee is selected */}
      <AnimatePresence>
        {selectedId && canSelect && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-30"
          >
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-gold hover:bg-gold-light text-base font-bold px-10 py-4 rounded-xl shadow-2xl shadow-gold/25 flex items-center gap-2.5 transition-colors"
            >
              Confirm Vote
              <span aria-hidden>→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal — AnimatePresence handles enter/exit */}
      <AnimatePresence>
        {showModal && selectedNominee && (
          <VoteConfirmModal
            nominee={selectedNominee}
            categoryName={categoryName}
            onConfirm={handleConfirmVote}
            onCancel={() => setShowModal(false)}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function fireConfetti() {
  const colors = ['#C9A84C', '#E8C96D', '#F5F5F5', '#8B6914', '#4CAF50']
  void confetti({ particleCount: 80, spread: 70, origin: { y: 0.55 }, colors })
  setTimeout(() => {
    void confetti({ particleCount: 35, spread: 90, origin: { y: 0.55, x: 0.3 }, colors })
    void confetti({ particleCount: 35, spread: 90, origin: { y: 0.55, x: 0.7 }, colors })
  }, 160)
}

function CheckCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-success flex-shrink-0"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
