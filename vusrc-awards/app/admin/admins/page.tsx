import { getAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AdminsClient } from '@/components/admin/AdminsClient'

export default async function AdminsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  if (session.role !== 'superadmin') redirect('/admin?notice=superadmin_only')
  return <AdminsClient currentAdminId={session.adminId} />
}
