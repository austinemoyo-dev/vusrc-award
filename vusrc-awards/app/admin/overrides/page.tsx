import { getAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import OverridesClient from '@/components/admin/OverridesClient'

export default async function OverridesPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <OverridesClient />
}
