'use client'

import { useState, useEffect } from 'react'

type State = 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported'

const STORAGE_KEY = 'vusrc_push_dismissed'

export function PushNotificationPrompt() {
  const [state, setState] = useState<State>('idle')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Hide if already dismissed or notifications unsupported
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (sessionStorage.getItem(STORAGE_KEY)) return
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    if (Notification.permission === 'granted') {
      // Already subscribed — register SW silently and hide prompt
      void registerAndSubscribe(false)
      return
    }
    // Show after a short delay so the page loads first
    const t = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(t)
  }, [])

  async function registerAndSubscribe(showFeedback: boolean): Promise<void> {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
      }

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (showFeedback) setState('subscribed')
      setVisible(false)
    } catch {
      // User may have blocked or SW failed — dismiss silently
      if (showFeedback) setVisible(false)
    }
  }

  async function handleEnable() {
    setState('subscribing')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState('denied')
      setVisible(false)
      sessionStorage.setItem(STORAGE_KEY, '1')
      return
    }
    await registerAndSubscribe(true)
  }

  function handleDismiss() {
    setVisible(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible || state === 'unsupported' || state === 'denied') return null

  return (
    <div
      role="banner"
      aria-label="Enable voting notifications"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-gold/10 border-b border-gold/20 px-4 py-2.5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-gold text-base flex-shrink-0" aria-hidden>🔔</span>
        <p className="text-foreground/80 text-sm leading-snug">
          {state === 'subscribed'
            ? "You're set! We'll notify you when voting opens or closes."
            : "Get notified when a category opens or closes for voting."}
        </p>
      </div>

      {state !== 'subscribed' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleEnable}
            disabled={state === 'subscribing'}
            className="bg-gold hover:bg-gold-light active:bg-gold-muted text-base text-xs font-bold rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {state === 'subscribing' ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="text-muted hover:text-foreground transition-colors p-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// Convert base64url VAPID key to Uint8Array for pushManager.subscribe()
// new Uint8Array(n) creates Uint8Array<ArrayBuffer> which satisfies BufferSource
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
