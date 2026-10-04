'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavLinks } from './nav-links'
import { logout } from '@/app/auth/login/actions'

interface SidebarProps {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  isSuperadmin: boolean
}

function UserInfo({ firstName, lastName, email, isSuperadmin }: SidebarProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email || 'Usuario'
  const initials = firstName ? firstName[0].toUpperCase() : (email?.[0]?.toUpperCase() ?? 'U')

  return (
    <div className="px-3 py-3 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: isSuperadmin ? '#FF7316' : 'rgba(255,255,255,0.15)', color: '#fff' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{displayName}</p>
        {isSuperadmin && (
          <span className="text-xs font-semibold" style={{ color: '#FF7316' }}>Superadmin</span>
        )}
      </div>
      <Link
        href="/settings"
        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        aria-label="Configuración"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </Link>
    </div>
  )
}

function LogoutButton() {
  return (
    <div className="px-3 pb-3">
      <form action={logout}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}

export function Sidebar({ firstName, lastName, email, isSuperadmin }: SidebarProps) {
  const [open, setOpen] = useState(false)

  const navContent = (
    <>
      <NavLinks isSuperadmin={isSuperadmin} onNavClick={() => setOpen(false)} />
      <UserInfo firstName={firstName} lastName={lastName} email={email} isSuperadmin={isSuperadmin} />
      <LogoutButton />
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col" style={{ backgroundColor: '#1F2937' }}>
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ark.png" alt="ARK" style={{ height: '28px', width: 'auto', display: 'block' }} />
          </div>
        </div>
        {navContent}
      </aside>

      {/* Mobile header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{ backgroundColor: '#1F2937', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="rounded-lg px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ark.png" alt="ARK" style={{ height: '22px', width: 'auto', display: 'block' }} />
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col transition-transform duration-300"
        style={{
          backgroundColor: '#1F2937',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="rounded-lg px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ark.png" alt="ARK" style={{ height: '22px', width: 'auto', display: 'block' }} />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            aria-label="Cerrar menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {navContent}
      </aside>
    </>
  )
}
