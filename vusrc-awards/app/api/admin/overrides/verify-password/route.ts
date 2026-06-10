import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

// In-memory rate limiter: 5 attempts per 10 min per adminId
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(adminId: string): boolean {
  const now = Date.now()
  const entry = attempts.get(adminId)
  if (!entry || now > entry.resetAt) {
    attempts.set(adminId, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(session.adminId)) {
    return Response.json(
      { error: 'Too many attempts. Try again in 10 minutes.', code: 'rate_limited' },
      { status: 429 }
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  if (!body.password) {
    return Response.json({ error: 'Password required', code: 'bad_request' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: admin } = await supabase
    .from('admins')
    .select('password_hash')
    .eq('id', session.adminId)
    .maybeSingle()

  if (!admin) {
    return Response.json({ error: 'Admin not found', code: 'not_found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(body.password, admin.password_hash as string)
  return Response.json({ valid })
}
