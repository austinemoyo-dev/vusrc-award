import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { errorResponse } = await requireAdmin('superadmin')
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const { errorResponse, session } = await requireAdmin('superadmin')
  if (errorResponse) return errorResponse

  let body: { email?: string; password?: string; role?: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }) }

  const email = body.email?.trim().toLowerCase()
  const password = body.password?.trim()
  const role = body.role === 'superadmin' ? 'superadmin' : 'admin'

  if (!email) return Response.json({ error: 'email is required' }, { status: 400 })
  if (!password || password.length < 8) return Response.json({ error: 'password must be at least 8 characters' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('admins').select('id').eq('email', email).maybeSingle()
  if (existing) return Response.json({ error: 'An admin with that email already exists' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)

  const { data, error } = await supabase
    .from('admins')
    .insert({ email, password_hash: passwordHash, role })
    .select('id, email, role, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { errorResponse, session } = await requireAdmin('superadmin')
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  // Prevent superadmin from deleting themselves
  if (session!.adminId === id) return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('admins').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
