import 'server-only'
import { getAdminSession } from './session'
import type { AdminPayload } from '@/types'

type GuardOk = { session: AdminPayload; errorResponse: null }
type GuardErr = { session: null; errorResponse: Response }
type GuardResult = GuardOk | GuardErr

export async function requireAdmin(requiredRole?: 'superadmin'): Promise<GuardResult> {
  const session = await getAdminSession()
  if (!session) {
    return {
      session: null,
      errorResponse: Response.json(
        { error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      ),
    }
  }
  if (requiredRole && session.role !== requiredRole) {
    return {
      session: null,
      errorResponse: Response.json(
        { error: 'Forbidden', code: 'forbidden' },
        { status: 403 }
      ),
    }
  }
  return { session, errorResponse: null }
}
