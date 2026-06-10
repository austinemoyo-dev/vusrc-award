'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface AdminShellProps {
  children: React.ReactNode
  email: string
  role: 'admin' | 'superadmin'
}

const PAGE_TITLES: Record<string, string> = {
  '/admin':            'Dashboard',
  '/admin/categories': 'Categories',
  '/admin/nominees':   'Nominees',
  '/admin/students':   'Students',
  '/admin/results':    'Results',
  '/admin/overrides':  'Overrides',
  '/admin/admins':     'Admin Accounts',
  '/display/controller': 'Display Controller',
}

export function AdminShell({ children, email, role }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('notice') === 'superadmin_only') {
      setNotice('Access restricted to Super Admins only.')
      const url = new URL(window.location.href)
      url.searchParams.delete('notice')
      window.history.replaceState({}, '', url.toString())
      const t = setTimeout(() => setNotice(null), 5000)
      return () => clearTimeout(t)
    }
  }, [])

  async function handleLogout() {
    setSigningOut(true)
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href + '/') || pathname === href
  }

  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'
  const initials = email.split('@')[0].slice(0, 2).toUpperCase()

  const navItems: NavItem[] = [
    { href: '/admin',            label: 'Dashboard',  icon: <DashboardIcon /> },
    { href: '/admin/categories', label: 'Categories', icon: <FolderIcon /> },
    { href: '/admin/nominees',   label: 'Nominees',   icon: <UsersIcon /> },
    { href: '/admin/students',   label: 'Students',   icon: <GraduationIcon /> },
    { href: '/admin/results',    label: 'Results',    icon: <ChartIcon /> },
    { href: '/admin/overrides',  label: 'Overrides',  icon: <ShieldIcon /> },
    ...(role === 'superadmin' ? [{ href: '/admin/admins', label: 'Admins', icon: <KeyIcon /> }] : []),
  ]

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border/50 flex-shrink-0">
        <div className="flex flex-col">
          <span className="font-display font-light text-gold tracking-[0.35em] uppercase leading-none" style={{ fontSize: '1rem' }}>
            VUSRC
          </span>
          <span className="font-sans font-light text-[9px] text-gold/30 tracking-[0.4em] uppercase mt-1">Administration</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all font-sans font-light tracking-wide border-l-2',
                active
                  ? 'border-gold/50 text-gold bg-gold/[0.06]'
                  : 'border-transparent text-muted hover:text-foreground hover:bg-surface-2',
              ].join(' ')}
            >
              <span className={active ? 'text-gold' : 'text-muted/70'}>{icon}</span>
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" aria-hidden />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border flex-shrink-0 space-y-2">

        {/* Display Controller shortcut */}
        <a
          href="/display/controller"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-all"
        >
          <DisplayIcon />
          Display Controller
          <span className="ml-auto text-[10px] text-muted/40 border border-border rounded px-1 py-0.5">↗</span>
        </a>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
            <span className="text-gold text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground/80 text-xs font-medium truncate">{email}</p>
            <p className={[
              'text-[10px] font-semibold uppercase tracking-wider',
              role === 'superadmin' ? 'text-gold' : 'text-muted',
            ].join(' ')}>
              {role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted text-sm hover:text-red-400 hover:bg-red-400/5 transition-colors disabled:opacity-50"
        >
          <LogoutIcon />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-base">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-60 bg-surface border-r border-border transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto md:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {SidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface/50 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-muted hover:text-foreground transition-colors md:hidden rounded-lg hover:bg-surface-2"
              aria-label="Open navigation"
            >
              <MenuIcon />
            </button>
            <h1 className="font-display font-light text-foreground/80 tracking-[0.15em]" style={{ fontSize: '1rem' }}>{pageTitle}</h1>
          </div>

          {/* Mobile sign-out */}
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="md:hidden text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/5 disabled:opacity-50"
            aria-label="Sign out"
          >
            <LogoutIcon />
          </button>
        </header>

        {/* Notice banner */}
        {notice && (
          <div className="px-5 py-2.5 bg-amber-500/8 border-b border-amber-500/20 flex items-center justify-between gap-4 flex-shrink-0">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <WarningIcon />
              {notice}
            </p>
            <button onClick={() => setNotice(null)} className="text-amber-400/60 hover:text-amber-400 flex-shrink-0" aria-label="Dismiss">
              <XSmall />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function GraduationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function DisplayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function XSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}
