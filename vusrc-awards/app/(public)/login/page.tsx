'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PinInput } from '@/components/student/PinInput'
import { generateFingerprint } from '@/lib/fingerprint'

type Step = 'matric' | 'setup' | 'login'
interface StudentInfo { matricNumber: string; fullName: string }

const slide = {
  enter:  { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0,  transition: { duration: 0.3, ease: 'easeOut' } },
  exit:   { opacity: 0, x: -40, transition: { duration: 0.2, ease: 'easeIn' } },
} as const

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.09] text-foreground rounded-none px-4 py-3.5 text-base placeholder-foreground/20 focus:outline-none focus:border-gold/50 transition-colors font-sans tracking-wide'
const btnCls   = 'w-full border border-gold/40 hover:border-gold/80 bg-gold/0 hover:bg-gold/[0.07] text-gold font-display font-light tracking-[0.3em] uppercase text-sm py-3.5 transition-all duration-300 disabled:opacity-30'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep]             = useState<Step>('matric')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [matricInput, setMatricInput] = useState('')
  const [pin, setPin]               = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [lockedUntil, setLockedUntil]   = useState<Date | null>(null)
  const [timeLeft, setTimeLeft]         = useState('')
  const matricRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const diff = lockedUntil.getTime() - Date.now()
      if (diff <= 0) { setLockedUntil(null); setTimeLeft(''); setError(''); return }
      const mins = Math.floor(diff / 60_000)
      const secs = Math.floor((diff % 60_000) / 1000)
      setTimeLeft(`${mins}m ${secs.toString().padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [lockedUntil])

  function resetToMatric() {
    setStep('matric'); setStudentInfo(null); setPin(''); setConfirmPin('')
    setError(''); setAttemptsLeft(null); setLockedUntil(null)
    setTimeout(() => matricRef.current?.focus(), 50)
  }

  async function handleMatricSubmit(e: React.FormEvent) {
    e.preventDefault()
    const matric = matricInput.trim().toUpperCase()
    if (!matric) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/check-matric', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricNumber: matric }) })
      const data = await res.json()
      if (res.status === 429) { setError('Too many attempts. Please wait a minute and try again.'); return }
      if (!res.ok || !data.exists) { setError('Matric number not recognised. Check the number and try again.'); return }
      setStudentInfo({ matricNumber: data.matricNumber ?? matric, fullName: data.fullName })
      setPin(''); setConfirmPin(''); setError('')
      setStep(data.pinSet ? 'login' : 'setup')
    } catch { setError('Network error. Check your internet connection and try again.') }
    finally { setLoading(false) }
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) { setError('PIN must be at least 4 digits.'); return }
    if (pin !== confirmPin) { setError('PINs do not match. Please re-enter both.'); setConfirmPin(''); return }
    setLoading(true); setError('')
    try {
      const fingerprint = await generateFingerprint()
      const res  = await fetch('/api/auth/setup-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricNumber: studentInfo!.matricNumber, pin, deviceFingerprint: fingerprint }) })
      const data = await res.json()
      if (!res.ok) { setError(res.status === 403 ? 'This phone has already been used to set up a different account.' : (data.error ?? 'Setup failed.')); return }
      router.push('/vote')
    } catch { setError('Network error. Check your internet connection and try again.') }
    finally { setLoading(false) }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockedUntil && lockedUntil > new Date()) return
    if (pin.length < 4) { setError('Please enter your PIN.'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricNumber: studentInfo!.matricNumber, pin }) })
      const data = await res.json()
      if (!res.ok) {
        setPin('')
        if (res.status === 429 && data.unlockAt) { setLockedUntil(new Date(data.unlockAt)); setAttemptsLeft(null); setError('') }
        else { const left = data.attemptsLeft ?? null; setAttemptsLeft(left); setError(left != null ? `Incorrect PIN — ${left} attempt${left === 1 ? '' : 's'} remaining.` : 'Incorrect PIN.') }
        return
      }
      router.push('/vote')
    } catch { setError('Network error. Check your internet connection and try again.') }
    finally { setLoading(false) }
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-5 py-14 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(201,168,76,0.055) 0%, transparent 68%)' }}
        aria-hidden
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(3,17,13,0.9) 100%)' }}
        aria-hidden
      />

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 text-center select-none relative z-10"
      >
        <h1
          className="font-display font-light text-foreground tracking-[0.4em] uppercase"
          style={{ fontSize: 'clamp(2.2rem, 8vw, 4rem)', textShadow: '0 0 60px rgba(201,168,76,0.1)' }}
        >
          VUSRC
        </h1>
        {/* hairline rule */}
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-3 mb-2 h-px origin-center"
          style={{ width: 80, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)' }}
          aria-hidden
        />
        <p className="font-sans font-light text-[10px] text-gold/35 tracking-[0.5em] uppercase mt-2">
          Student Week {year}
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[340px] border border-white/[0.07] bg-white/[0.025]"
      >
        <AnimatePresence mode="wait" initial={false}>

          {/* MATRIC */}
          {step === 'matric' && (
            <motion.div key="matric" variants={slide} initial="enter" animate="center" exit="exit" className="p-8">
              <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-4">Sign In</p>
              <h2 className="font-display font-light text-foreground/90 leading-tight mb-1" style={{ fontSize: '1.5rem', letterSpacing: '0.04em' }}>
                Welcome
              </h2>
              <p className="font-sans font-light text-foreground/30 text-sm mb-7 leading-relaxed">
                Enter your matric number or phone number to continue.
              </p>
              <form onSubmit={handleMatricSubmit} className="space-y-4">
                <input
                  ref={matricRef} type="text" value={matricInput}
                  onChange={(e) => { setMatricInput(e.target.value); setError('') }}
                  placeholder="Matric or phone number"
                  disabled={loading} autoComplete="username" autoFocus
                  className={inputCls}
                />
                <AnimatePresence>
                  {error && (
                    <motion.p key="e" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="font-sans text-red-400/80 text-xs leading-relaxed">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={loading || !matricInput.trim()} className={btnCls}>
                  {loading ? <Spinner /> : 'Continue →'}
                </button>
              </form>
            </motion.div>
          )}

          {/* SETUP PIN */}
          {step === 'setup' && studentInfo && (
            <motion.div key="setup" variants={slide} initial="enter" animate="center" exit="exit" className="p-8">
              <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-4">First Time</p>
              <h2 className="font-display font-light text-foreground/90 leading-tight mb-1" style={{ fontSize: '1.5rem', letterSpacing: '0.04em' }}>
                Hi, <em style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.8)' }}>{studentInfo.fullName.split(' ')[0]}</em>
              </h2>
              <p className="font-sans font-light text-foreground/30 text-sm mb-7 leading-relaxed">
                Create a 4–6 digit PIN to secure your account.
              </p>
              <form onSubmit={handleSetupSubmit} className="space-y-5">
                <div>
                  <p className="font-sans text-[10px] text-foreground/30 mb-2.5 text-center tracking-[0.25em] uppercase">New PIN</p>
                  <PinInput length={4} value={pin} onChange={setPin} disabled={loading} autoFocus />
                </div>
                <div>
                  <p className="font-sans text-[10px] text-foreground/30 mb-2.5 text-center tracking-[0.25em] uppercase">Confirm PIN</p>
                  <PinInput length={4} value={confirmPin} onChange={setConfirmPin} disabled={loading} />
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p key="e" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="font-sans text-red-400/80 text-xs text-center leading-relaxed">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={loading || pin.length < 4 || confirmPin.length < 4} className={btnCls}>
                  {loading ? <Spinner /> : 'Set PIN & Vote →'}
                </button>
              </form>
              <BackBtn onClick={resetToMatric} />
            </motion.div>
          )}

          {/* LOGIN */}
          {step === 'login' && studentInfo && (
            <motion.div key="login" variants={slide} initial="enter" animate="center" exit="exit" className="p-8">
              <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-4">Welcome Back</p>
              <h2 className="font-display font-light text-foreground/90 leading-tight mb-1" style={{ fontSize: '1.5rem', letterSpacing: '0.04em' }}>
                <em style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.8)' }}>{studentInfo.fullName.split(' ')[0]}</em>
              </h2>
              <p className="font-sans font-light text-foreground/30 text-sm mb-7 leading-relaxed">
                Enter your PIN to cast your vote.
              </p>
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <PinInput length={4} value={pin} onChange={(v) => { setPin(v); setError('') }} disabled={loading || !!lockedUntil} autoFocus />
                <AnimatePresence mode="wait">
                  {lockedUntil ? (
                    <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                      <p className="font-sans text-amber-400/70 text-xs">Account locked.</p>
                      <p className="font-sans text-amber-300/60 text-sm font-light mt-1 tabular-nums">Try again in {timeLeft}</p>
                    </motion.div>
                  ) : error ? (
                    <motion.p key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="font-sans text-red-400/80 text-xs text-center leading-relaxed">
                      {error}
                    </motion.p>
                  ) : attemptsLeft != null ? (
                    <motion.p key="att" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="font-sans text-amber-400/60 text-xs text-center">
                      {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <button type="submit" disabled={loading || pin.length < 4 || !!lockedUntil} className={btnCls}>
                  {loading ? <Spinner /> : 'Vote →'}
                </button>
              </form>
              <BackBtn onClick={resetToMatric} />
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="relative z-10 mt-10 font-sans font-light text-[10px] text-foreground/20 tracking-[0.4em] uppercase"
      >
        Vision University &nbsp;·&nbsp; {year}
        <span className="block mt-1 text-[9px] text-foreground/12 tracking-[0.3em]">
          Crafted by <span className="text-gold/30">Dash &amp; Co.</span>
        </span>
      </motion.p>
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="mt-6 w-full font-sans font-light text-[11px] text-foreground/20 hover:text-foreground/45 transition-colors tracking-[0.25em] uppercase py-1">
      ← Different number
    </button>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
