import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { revokeInvite, resendInvite } from '../tenants/[id]/actions'

export default async function SuperAdminUsersPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: profiles } = await supabase
    .from('user_profile')
    .select('id, first_name, last_name, is_platform_admin, tenant_id, tenants(name, slug)')
    .order('is_platform_admin', { ascending: false })

  // All memberships grouped by user for multi-tenant display
  const { data: allMemberships } = await adminClient
    .from('user_tenant_membership')
    .select('user_id, tenant_id, tenants(name)')
    .eq('is_active', true)

  const membershipsByUser = new Map<string, { tenant_id: string; name: string }[]>()
  for (const m of allMemberships ?? []) {
    const t = m.tenants as unknown as { name: string } | null
    if (!membershipsByUser.has(m.user_id)) membershipsByUser.set(m.user_id, [])
    membershipsByUser.get(m.user_id)!.push({ tenant_id: m.tenant_id, name: t?.name ?? m.tenant_id })
  }

  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = usersData?.users ?? []
  const emailMap: Record<string, string> = Object.fromEntries(
    authUsers.map(u => [u.id, u.email ?? ''])
  )

  // All pending invites across all tenants
  const INVITE_EXPIRY_HOURS = 24
  const now = new Date()
  const pendingInvites = authUsers
    .filter(u => u.invited_at && !u.confirmed_at)
    .map(u => {
      const meta = u.user_metadata as Record<string, unknown> | null
      const tenantId = (meta?.tenant_id as string) ?? null
      const invitedAt = new Date(u.invited_at!)
      const hoursAgo = (now.getTime() - invitedAt.getTime()) / 3_600_000
      return { id: u.id, email: u.email ?? '', invitedAt, expired: hoursAgo > INVITE_EXPIRY_HOURS, tenantId }
    })

  // Fetch tenant names for pending invites
  const tenantIds = [...new Set(pendingInvites.map(i => i.tenantId).filter(Boolean))]
  const { data: tenants } = tenantIds.length > 0
    ? await adminClient.from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] }
  const tenantNameMap = new Map((tenants ?? []).map(t => [t.id, t.name]))

  const t = await getTranslations('superadmin')

  return (
    <div className="space-y-6">
      {/* Pending invites section */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            Invitaciones pendientes
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{pendingInvites.length}</span>
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #FDE68A' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">Taller</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">Enviada</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map(inv => (
                  <tr key={inv.id} className="border-b border-amber-100 last:border-0 hover:bg-amber-100/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                          {inv.email[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.tenantId
                        ? <Link href={`/superadmin/tenants/${inv.tenantId}?tab=users`} className="text-xs text-gray-600 hover:text-orange-600 transition-colors">{tenantNameMap.get(inv.tenantId) ?? inv.tenantId}</Link>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {inv.invitedAt.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.expired
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"/>Expirada</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>Pendiente</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.tenantId && (
                        <div className="flex items-center gap-2 justify-end">
                          <form action={resendInvite}>
                            <input type="hidden" name="user_id" value={inv.id} />
                            <input type="hidden" name="email" value={inv.email} />
                            <input type="hidden" name="tenant_id" value={inv.tenantId} />
                            <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                              Reenviar
                            </button>
                          </form>
                          <form action={revokeInvite}>
                            <input type="hidden" name="user_id" value={inv.id} />
                            <input type="hidden" name="tenant_id" value={inv.tenantId} />
                            <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                              Revocar
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{t('users.count', { n: profiles?.length ?? 0 })}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.user')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.email')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.workshop')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.role')}</th>
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
                    {(() => {
                      const userMemberships = membershipsByUser.get(p.id) ?? []
                      if (userMemberships.length === 0) {
                        return <span className="text-gray-300 text-xs">{t('users.noWorkshop')}</span>
                      }
                      return (
                        <div className="flex flex-wrap gap-1">
                          {userMemberships.map(m => (
                            <Link key={m.tenant_id} href={`/superadmin/tenants/${m.tenant_id}`}
                              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                m.tenant_id === p.tenant_id
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}>
                              {m.name}
                            </Link>
                          ))}
                        </div>
                      )
                    })()}
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
                          {t('users.roleSuperadmin')}
                        </span>
                      )
                      : <span className="text-xs font-medium text-gray-500">{t('users.roleAdmin')}</span>
                    }
                  </td>
                </tr>
              )
            })}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">{t('users.empty')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
