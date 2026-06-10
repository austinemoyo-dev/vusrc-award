'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.09] text-foreground rounded-none px-4 py-3.5 text-base placeholder-foreground/20 focus:outline-none focus:border-gold/50 transition-colors font-sans tracking-wide'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPw,   setShowPw]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid credentials.'); return }
      router.push('/admin')
    } catch { setError('Network error. Check your connection.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-5 py-14 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(201,168,76,0.05) 0%, transparent 68%)' }}
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
          style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', textShadow: '0 0 60px rgba(201,168,76,0.1)' }}
        >
          VUSRC
        </h1>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-3 h-px origin-center"
          style={{ width: 72, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)' }}
          aria-hidden
        />
        <p className="font-sans font-light text-[10px] text-gold/35 tracking-[0.5em] uppercase mt-2.5">
          Administration
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[340px] border border-white/[0.07] bg-white/[0.025]"
      >
        <div className="p-8">
          <p className="font-sans font-light text-[10px] text-gold/40 tracking-[0.5em] uppercase mb-4">Secure Access</p>
          <h2 className="font-display font-light text-foreground/90 mb-1" style={{ fontSize: '1.4rem', letterSpacing: '0.04em' }}>
            Sign In
          </h2>
          <p className="font-sans font-light text-foreground/30 text-sm mb-7 leading-relaxed">
            Enter your administrator credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-[10px] text-foreground/30 tracking-[0.3em] uppercase mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="admin@visionuniversity.edu.ng"
                disabled={loading} autoComplete="username" autoFocus
                className={inputCls}
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] text-foreground/30 tracking-[0.3em] uppercase mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  disabled={loading} autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/25 hover:text-foreground/55 transition-colors p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <p className="font-sans text-red-400/80 text-xs leading-relaxed flex items-center gap-1.5">
                <span>⚠</span>{error}
              </p>
            )}

            <button
              type="submit" disabled={loading || !email || !password}
              className="w-full border border-gold/40 hover:border-gold/80 bg-gold/0 hover:bg-gold/[0.07] text-gold font-display font-light tracking-[0.3em] uppercase text-sm py-3.5 transition-all duration-300 disabled:opacity-30 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Signing in…
                </span>
              ) : 'Enter →'}
            </button>
          </form>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="relative z-10 mt-10 font-sans font-light text-[10px] text-foreground/15 tracking-[0.4em] uppercase text-center"
      >
        Authorised personnel only
        <span className="block mt-1 text-[9px] text-foreground/10 tracking-[0.3em]">
          Crafted by <span className="text-gold/25">Dash &amp; Co.</span>
        </span>
      </motion.p>
    </div>
  )
}

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}
function EyeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
}
function Spinner() {
  return <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
}
