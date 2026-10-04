import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-56 bg-black flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <p className="text-white font-bold text-sm uppercase tracking-widest">Superadmin</p>
          <p className="text-gray-500 text-xs mt-0.5">DA Workshop Platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { href: '/superadmin', label: 'Tenants' },
            { href: '/superadmin/tenants/new', label: 'Nuevo taller' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-900 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
