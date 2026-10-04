import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/auth/login/actions'

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',         icon: '◻' },
  { href: '/work-orders',   label: 'Órdenes de Trabajo', icon: '◻' },
  { href: '/customers',     label: 'Clientes',           icon: '◻' },
  { href: '/vehicles',      label: 'Vehículos',          icon: '◻' },
  { href: '/appointments',  label: 'Agenda',             icon: '◻' },
  { href: '/inventory',     label: 'Inventario',         icon: '◻' },
  { href: '/billing',       label: 'Facturación',        icon: '◻' },
  { href: '/reports',       label: 'Reportes',           icon: '◻' },
  { href: '/config',        label: 'Configuración',      icon: '◻' },
]

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <p className="text-white font-bold text-lg">DA Workshop</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {profile?.first_name} {profile?.last_name}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span className="text-slate-500 text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
