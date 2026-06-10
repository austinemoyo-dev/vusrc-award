import { getAdminSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()

  // No session — proxy.ts handles the redirect to /admin/login for protected
  // routes. For /admin/login itself, render children directly (no shell).
  if (!session) return <>{children}</>

  const supabase = createServiceClient()
  const { data: admin } = await supabase
    .from('admins')
    .select('email')
    .eq('id', session.adminId)
    .maybeSingle()

  const email = (admin?.email as string | undefined) ?? session.adminId

  return (
    <AdminShell email={email} role={session.role}>
      {children}
    </AdminShell>
  )
}
