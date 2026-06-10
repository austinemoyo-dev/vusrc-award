'use client'

import { useState, useEffect } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function computeTimeLeft(targetMs: number): TimeLeft {
  const diff = Math.max(0, targetMs - Date.now())
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  / 60_000),
    seconds: Math.floor((diff % 60_000)     / 1_000),
  }
}

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [mounted, setMounted] = useState(false)
  const [expired, setExpired] = useState(false)
  const [tl, setTl] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    setMounted(true)
    const targetMs = new Date(targetDate).getTime()

    function tick() {
      const diff = targetMs - Date.now()
      if (diff <= 0) { setExpired(true); return }
      setTl(computeTimeLeft(targetMs))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  // Render nothing on server to prevent hydration mismatch
  if (!mounted) {
    return <div className="h-20" aria-hidden />
  }

  if (expired) {
    return (
      <div className="inline-flex items-center gap-3 border border-gold/40 rounded-full px-5 py-2.5">
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span className="text-gold font-semibold tracking-wide">Voting is Open</span>
      </div>
    )
  }

  const units = [
    { label: 'Days',    value: tl.days    },
    { label: 'Hours',   value: tl.hours   },
    { label: 'Minutes', value: tl.minutes },
    { label: 'Seconds', value: tl.seconds },
  ]

  return (
    <div className="flex items-end gap-2 sm:gap-3" aria-label="Countdown timer">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-end gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-surface border border-border rounded-xl flex items-center justify-center">
              <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums leading-none">
                {String(value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[10px] text-muted uppercase tracking-widest">{label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-gold/60 text-xl font-bold mb-6 select-none">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
