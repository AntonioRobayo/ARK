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
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            {/* ARK A symbol */}
            <div className="relative w-8 h-8 shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <polygon points="16,3 30,29 2,29" fill="none" stroke="#FF7316" strokeWidth="2.5" strokeLinejoin="round"/>
                <line x1="7.5" y1="22" x2="24.5" y2="22" stroke="#FF7316" strokeWidth="2.5" strokeLinecap="round"/>
                <polygon points="16,3 30,29 2,29" fill="url(#g)" opacity="0.12"/>
                <defs>
                  <linearGradient id="g" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF7316"/>
                    <stop offset="1" stopColor="#EA580C"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="font-bold text-white" style={{ fontSize: '18px', letterSpacing: '0.1em' }}>ARK</p>
              <p style={{ color: '#FF7316', fontSize: '8px', marginTop: '-2px', letterSpacing: '0.15em' }} className="font-semibold uppercase">Workshop</p>
            </div>
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
