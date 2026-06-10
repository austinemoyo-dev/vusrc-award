'use client'

import { useRef, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react'

interface PinInputProps {
  length: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function PinInput({ length, value, onChange, disabled, autoFocus }: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    onChange(next.join(''))
    if (digit && index < length - 1) focusAt(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        next[index - 1] = ''
        onChange(next.join(''))
        focusAt(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusAt(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    focusAt(Math.min(pasted.length, length - 1))
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="PIN entry">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="password"
          inputMode="numeric"
          pattern="\d"
          maxLength={2}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          autoComplete="one-time-code"
          aria-label={`PIN digit ${i + 1} of ${length}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={[
            'w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl',
            'border-2 bg-white/5 text-white caret-transparent',
            'transition-all duration-150 focus:outline-none',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            digit
              ? 'border-[#C9A84C]/80 bg-[#C9A84C]/10'
              : 'border-white/15 focus:border-[#C9A84C]/60',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
