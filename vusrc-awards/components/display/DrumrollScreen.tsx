'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  id: number
  left: string
  size: number
  delay: string
  duration: string
  opacity: number
}

export function DrumrollScreen() {
  const year = new Date().getFullYear()

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${3 + i * 3.4}%`,
        size: 2 + (i % 6),
        delay: `${(i * 0.19).toFixed(2)}s`,
        duration: `${3.5 + (i % 5)}s`,
        opacity: 0.1 + (i % 4) * 0.1,
      })),
    []
  )

  return (
    <div className="relative w-full h-full bg-base flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes rise-p {
          0%   { transform: translateY(0) scale(1);     opacity: var(--op); }
          100% { transform: translateY(-95vh) scale(0.2); opacity: 0; }
        }
        @keyframes glow-ring {
          0%, 100% { box-shadow: 0 0 50px rgba(201,168,76,0.3), 0 0 100px rgba(201,168,76,0.1); }
          50%       { box-shadow: 0 0 100px rgba(201,168,76,0.65), 0 0 200px rgba(201,168,76,0.25); }
        }
        @keyframes spin-d {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Floating gold particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gold"
          style={{
            left: p.left,
            bottom: '8%',
            width: p.size,
            height: p.size,
            '--op': p.opacity,
            animation: `rise-p ${p.duration} ${p.delay} ease-in infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Concentric pulsing rings */}
      {[600, 480, 360].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            border: `1px solid rgba(201,168,76,${0.08 + i * 0.04})`,
            animation: `glow-ring ${2.5 + i * 0.4}s ${i * 0.5}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Spinner */}
      <div className="relative z-10" style={{
        width: 200,
        height: 200,
        animation: 'glow-ring 2.2s ease-in-out infinite',
      }}>
        <div
          className="w-full h-full rounded-full"
          style={{
            border: '5px solid rgba(201,168,76,0.12)',
            borderTop: '5px solid #C9A84C',
            animation: 'spin-d 1.2s linear infinite',
          }}
        />
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9 }}
        className="absolute z-10 text-center flex flex-col items-center gap-4"
      >
        <motion.p
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' as const }}
          className="font-serif font-black text-foreground"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
            textShadow: '0 0 60px rgba(201,168,76,0.4)',
          }}
        >
          And the winner is…
        </motion.p>

        <motion.div
          className="w-20 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }}
          animate={{ scaleX: [0.5, 1.3, 0.5], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' as const }}
        />
      </motion.div>

      {/* Corner watermark */}
      <p className="absolute bottom-7 right-10 text-foreground/15 text-xs tracking-[0.35em] uppercase">
        VUSRC Awards {year}
      </p>
    </div>
  )
}
