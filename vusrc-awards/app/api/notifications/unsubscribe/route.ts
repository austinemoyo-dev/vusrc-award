import { getStudentSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const session = await getStudentSession()
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.endpoint) {
    return Response.json({ error: 'endpoint is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('student_id', session.studentId)

  return Response.json({ success: true })
}
