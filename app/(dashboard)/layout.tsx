import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/login/actions'
import { NavLinks } from './nav-links'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F3F4F6', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar ARK */}
      <aside className="w-60 flex flex-col shrink-0" style={{ backgroundColor: '#1F2937' }}>
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            className="rounded-lg px-3 py-2 mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-ark.png"
              alt="ARK"
              style={{ height: '28px', width: 'auto', display: 'block' }}
            />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {profile?.first_name} {profile?.last_name}
          </p>
        </div>

        {/* Nav — Client component for active state */}
        <NavLinks />

        {/* Logout */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
