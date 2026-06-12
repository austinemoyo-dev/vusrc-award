import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

let vapidInitialised = false

function ensureVapid() {
  if (vapidInitialised) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.VAPID_EMAIL ?? 'mailto:admin@visionuniversity.edu.ng'
  if (!pub || !priv) return
  webpush.setVapidDetails(mail, pub, priv)
  vapidInitialised = true
}

interface NotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function broadcastPush(payload: NotificationPayload): Promise<void> {
  ensureVapid()
  if (!vapidInitialised) return

  const supabase = createServiceClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) return

  const json = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        )
      } catch (err: unknown) {
        // 410 Gone = subscription expired; clean it up silently
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )
}

export async function notifyCategoryOpened(name: string, slug: string): Promise<void> {
  await broadcastPush({
    title: `Voting is now open!`,
    body:  `Cast your vote for ${name} before it closes.`,
    url:   `/vote/${slug}`,
    tag:   `cat-open-${slug}`,
  })
}

export async function notifyCategoryClosed(name: string): Promise<void> {
  await broadcastPush({
    title: `Voting has closed: ${name}`,
    body:  'Check the results on the VUSRC Awards page.',
    url:   '/vote',
    tag:   `cat-closed-${name}`,
  })
}

export async function notifyRegistrationOpened(): Promise<void> {
  await broadcastPush({
    title: 'Account registration is now open!',
    body:  'Register with your matric number and set up your PIN to start voting.',
    url:   '/login',
    tag:   'registration-open',
  })
}

export async function notifyRegistrationClosed(): Promise<void> {
  await broadcastPush({
    title: 'Account registration has closed',
    body:  'New account creation is temporarily paused. Students who already registered can still log in and vote.',
    url:   '/login',
    tag:   'registration-closed',
  })
}
