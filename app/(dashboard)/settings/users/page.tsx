import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { checkPermission } from '@/lib/permissions'
import { inviteUser, toggleUserActive, changeRole, revokeInvite, resendInvite } from './actions'

type TenantRole =
  | 'owner'
  | 'shop_manager'
  | 'mechanic'
  | 'receptionist'
  | 'parts_manager'
  | 'accountant'

interface MemberRow {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
  is_active: boolean
  created_at: string
}

function roleBadge(role: string | null, t: Awaited<ReturnType<typeof getTranslations<'settings.users'>>>) {
  const label = role && role in {
    owner: 1, shop_manager: 1, mechanic: 1,
    receptionist: 1, parts_manager: 1, accountant: 1,
  }
    ? t(`roles.${role as TenantRole}`)
    : t('roles.unknown')

  if (role === 'owner') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#FFF0E6', color: '#FF7316' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        {label}
      </span>
    )
  }

  const colorMap: Record<string, string> = {
    shop_manager: 'bg-blue-50 text-blue-700',
    mechanic:     'bg-violet-50 text-violet-700',
    receptionist: 'bg-teal-50 text-teal-700',
    parts_manager:'bg-amber-50 text-amber-700',
    accountant:   'bg-rose-50 text-rose-700',
  }

  const cls = role ? (colorMap[role] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; invite?: string }>
}) {
  const { error, success, invite } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  // Get current user's tenant + role
  const { data: myProfile } = await supabase
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!myProfile?.tenant_id) redirect('/settings')

  // Get all members of this tenant
  const { data: members } = await adminClient
    .from('user_profile')
    .select('id, first_name, last_name, role, is_active, created_at')
    .eq('tenant_id', myProfile.tenant_id)
    .order('created_at', { ascending: true })

  // Get emails from auth + detect pending invites (invited but not confirmed)
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = Object.fromEntries(
    (usersData?.users ?? []).map(u => [u.id, u.email ?? ''])
  )

  const pendingInvites = (usersData?.users ?? []).filter(u => {
    if (u.email_confirmed_at) return false
    if (!u.invited_at) return false
    const meta = u.user_metadata as Record<string, unknown> | null
    return meta?.tenant_id === myProfile.tenant_id
  }).map(u => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.user_metadata as Record<string, unknown> | null)?.role as string | null,
    invited_at: u.invited_at,
  }))

  const t = await getTranslations('settings.users')

  // Get plan user limit
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('plan')
    .eq('id', myProfile.tenant_id)
    .single()

  let maxUsers: number | null = null
  if (tenant?.plan) {
    const { data: plan } = await adminClient
      .from('license_plan')
      .select('max_users')
      .eq('slug', tenant.plan)
      .single()
    maxUsers = plan?.max_users ?? null
  }

  const activeCount = (members ?? []).filter(m => m.is_active).length

  const [canManageRaw, canManageRoles] = await Promise.all([
    checkPermission('users.invite'),
    checkPermission('users.manage_roles'),
  ])
  const canManage = canManageRaw
  const showInviteForm = invite === '1'
  const atLimit = maxUsers !== null && activeCount >= maxUsers

  const ROLES: TenantRole[] = [
    'shop_manager',
    'mechanic',
    'receptionist',
    'parts_manager',
    'accountant',
  ]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManageRoles && (
            <Link
              href="/settings/roles"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Roles y permisos
            </Link>
          )}
          {maxUsers !== null && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              atLimit
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {activeCount} / {maxUsers} activos
            </span>
          )}
          {canManage && !showInviteForm && (
            atLimit ? (
              <span
                className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed"
                title="Has alcanzado el límite de usuarios de tu plan"
              >
                {t('inviteBtn')}
              </span>
            ) : (
              <Link
                href="/settings/users?invite=1"
                className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#FF7316' }}
              >
                {t('inviteBtn')}
              </Link>
            )
          )}
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {success === 'invited' ? t('invited') : t('statusActive')}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Invite form */}
      {canManage && showInviteForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('inviteTitle')}</h2>
          <form action={inviteUser} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('emailLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('roleLabel')}
                </label>
                <select
                  name="role"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                >
                  <option value="">{t('roles.unknown')}</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{t(`roles.${r}`)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#FF7316' }}
              >
                {t('sendInvite')}
              </button>
              <Link
                href="/settings/users"
                className="text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('cancelBtn')}
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Members table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('table.member')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('table.email')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('table.role')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('table.status')}
              </th>
              {canManage && (
                <th className="px-5 py-3" />
              )}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m: MemberRow) => {
              const email    = emailMap[m.id] ?? '—'
              const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || '—'
              const isMe     = m.id === user.id
              const isOwner  = m.role === 'owner'

              return (
                <tr
                  key={m.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: '1px solid #F9FAFB' }}
                >
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: isOwner ? '#FF7316' : '#6B7280' }}
                      >
                        {(m.first_name?.[0] ?? email[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{fullName}</span>
                        {isMe && (
                          <span className="ml-2 text-xs text-gray-400">(tú)</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {email}
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    {roleBadge(m.role, t)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    {m.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {t('statusActive')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                        {t('statusInactive')}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  {canManage && (
                    <td className="px-5 py-3.5">
                      {!isMe && !isOwner && (
                        <div className="flex items-center gap-2 justify-end">
                          {/* Role selector — only users with manage_roles permission */}
                          {canManageRoles && (
                            <form action={changeRole} className="flex items-center">
                              <input type="hidden" name="user_id" value={m.id} />
                              <select
                                name="role"
                                defaultValue={m.role ?? ''}
                                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                              >
                                {ROLES.map(r => (
                                  <option key={r} value={r}>{t(`roles.${r}`)}</option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="ml-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                title="Guardar rol"
                              >
                                ✓
                              </button>
                            </form>
                          )}
                          <form action={toggleUserActive}>
                            <input type="hidden" name="user_id" value={m.id} />
                            <input type="hidden" name="is_active" value={String(!m.is_active)} />
                            <button
                              type="submit"
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                                m.is_active
                                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {m.is_active ? t('deactivate') : t('reactivate')}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Pending invites */}
            {pendingInvites.map(inv => (
              <tr
                key={inv.id}
                className="hover:bg-gray-50 transition-colors"
                style={{ borderBottom: '1px solid #F9FAFB' }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gray-300 flex-shrink-0">
                      {(inv.email[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="text-gray-400 text-sm">—</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{inv.email}</td>
                <td className="px-5 py-3.5">{roleBadge(inv.role, t)}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Invitación enviada
                  </span>
                </td>
                {canManage && (
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <form action={resendInvite}>
                        <input type="hidden" name="user_id" value={inv.id} />
                        <input type="hidden" name="email" value={inv.email} />
                        <input type="hidden" name="role" value={inv.role ?? ''} />
                        <input type="hidden" name="tenant_id" value={myProfile.tenant_id!} />
                        <button
                          type="submit"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Reenviar
                        </button>
                      </form>
                      <form action={revokeInvite}>
                        <input type="hidden" name="user_id" value={inv.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {(members ?? []).length === 0 && pendingInvites.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">{t('empty')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
