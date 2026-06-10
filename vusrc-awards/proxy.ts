import { NextResponse, type NextRequest } from 'next/server'
import { verifyStudentToken, verifyAdminToken } from '@/lib/auth/jwt'

const STUDENT_COOKIE = 'vusrc_student_token'
const ADMIN_COOKIE = 'vusrc_admin_token'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Student-protected routes ─────────────────────────────────────────────
  if (pathname === '/vote' || pathname.startsWith('/vote/')) {
    const token = request.cookies.get(STUDENT_COOKIE)?.value
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const payload = await verifyStudentToken(token)
    if (!payload) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  // ── Admin-protected routes ────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url))
    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.redirect(new URL('/admin/login', request.url))

    // Superadmin-only gate
    if (pathname === '/admin/overrides' && payload.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
