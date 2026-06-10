import 'server-only'
import { cookies } from 'next/headers'
import { verifyStudentToken, verifyAdminToken } from './jwt'
import type { StudentPayload, AdminPayload } from '@/types'

const STUDENT_COOKIE = 'vusrc_student_token'
const ADMIN_COOKIE = 'vusrc_admin_token'
const MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

// ---------- Student ----------

export async function setStudentSession(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(STUDENT_COOKIE, token, cookieOptions(MAX_AGE))
}

export async function clearStudentSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(STUDENT_COOKIE)
}

export async function getStudentSession(): Promise<StudentPayload | null> {
  const jar = await cookies()
  const token = jar.get(STUDENT_COOKIE)?.value
  if (!token) return null
  return verifyStudentToken(token)
}

// ---------- Admin ----------

export async function setAdminSession(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, token, cookieOptions(MAX_AGE))
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(ADMIN_COOKIE)
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE)?.value
  if (!token) return null
  return verifyAdminToken(token)
}
