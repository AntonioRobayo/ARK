import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function SuperAdminUsersPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: profiles } = await supabase
    .from('user_profile')
    .select('id, first_name, last_name, is_platform_admin, tenant_id, tenants(name, slug)')
    .order('is_platform_admin', { ascending: false })

  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 200 })
  const authUsers = usersData?.users ?? []
  const emailMap: Record<string, string> = Object.fromEntries(
    authUsers.map(u => [u.id, u.email ?? ''])
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{profiles?.length ?? 0} usuarios registrados</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Taller</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map(p => {
              const tenant = p.tenants as unknown as { name: string; slug: string } | null
              const email = emailMap[p.id] ?? '—'
              const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—'
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: p.is_platform_admin ? '#FF7316' : '#6B7280' }}
                      >
                        {(p.first_name?.[0] ?? email[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{email || '—'}</td>
                  <td className="px-5 py-3.5">
                    {tenant
                      ? <span className="text-gray-700 text-sm">{tenant.name}</span>
                      : <span className="text-gray-300 text-xs">Sin taller</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {p.is_platform_admin
                      ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#FFF0E6', color: '#FF7316' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          Superadmin
                        </span>
                      )
                      : <span className="text-xs font-medium text-gray-500">Admin</span>
                    }
                  </td>
                </tr>
              )
            })}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">No hay usuarios registrados</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
