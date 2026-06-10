import { clearStudentSession } from '@/lib/auth/session'

export async function POST() {
  await clearStudentSession()
  return Response.json({ success: true })
}
