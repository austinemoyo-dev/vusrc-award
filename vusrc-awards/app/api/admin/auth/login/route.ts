import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { signAdminToken } from '@/lib/auth/jwt'
import { setAdminSession } from '@/lib/auth/session'

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return Response.json({ error: 'email and password are required.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, password_hash, role')
    .eq('email', email)
    .maybeSingle()

  if (error || !admin) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const hash = admin.password_hash as string | null
  if (!hash) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const passwordMatch = await bcrypt.compare(password, hash)
  if (!passwordMatch) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const token = await signAdminToken(admin.id, admin.role)
  await setAdminSession(token)

  return Response.json({ success: true, role: admin.role })
}
