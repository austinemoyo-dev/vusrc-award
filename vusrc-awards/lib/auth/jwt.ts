import { SignJWT, jwtVerify } from 'jose'
import type { StudentPayload, AdminPayload } from '@/types'

function getSecret() {
  const raw = process.env.JWT_SECRET
  if (!raw) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(raw)
}

// ---------- Student tokens ----------

export async function signStudentToken(studentId: string, matricNumber: string): Promise<string> {
  return new SignJWT({ studentId, matricNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyStudentToken(token: string): Promise<StudentPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as StudentPayload
  } catch {
    return null
  }
}

// ---------- Admin tokens ----------

export async function signAdminToken(adminId: string, role: string): Promise<string> {
  return new SignJWT({ adminId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}
