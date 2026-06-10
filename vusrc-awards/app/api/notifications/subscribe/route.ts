import { getStudentSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const session = await getStudentSession()
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { subscription?: PushSubscriptionJSON }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sub = body.subscription
  const endpoint = sub?.endpoint
  const p256dh   = sub?.keys?.p256dh
  const auth     = sub?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase.from('push_subscriptions').upsert(
    { student_id: session.studentId, endpoint, p256dh, auth },
    { onConflict: 'endpoint' }
  )

  if (error) {
    return Response.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return Response.json({ success: true })
}
