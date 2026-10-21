import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ImpersonatePanel } from './impersonate-panel'
import { LocalDate, LocalDateOnly } from '@/components/local-date'
import { resetUserPassword, inviteAdmin, revokeInvite, resendInvite, removeMember } from './actions'

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>
}) {
  const { id } = await params
  const { tab = 'users', success, error } = await searchParams

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, plan_expires_at, license_plan(name)')
    .eq('id', id)
    .single()

  if (!tenant) redirect('/superadmin')

  const t = await getTranslations('superadmin.tenantDetail')

  // ── Users (via tenant_members view) ──────────────────────────────────────
  const { data: members } = await adminClient
    .from('tenant_members')
    .select('user_id, role, first_name, last_name, is_platform_admin, active_tenant_id')
    .eq('tenant_id', id)
    .eq('is_active', true)

  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const profiles = (members ?? []).map(m => ({
    id: m.user_id,
    first_name: m.first_name ?? '',
    last_name: m.last_name ?? '',
    is_platform_admin: m.is_platform_admin ?? false,
    activeHere: m.active_tenant_id === id,
  }))

  // Pending invites for this tenant (invited but not yet confirmed)
  const INVITE_EXPIRY_HOURS = 24
  const now = new Date()
  const pendingInvites = authUsers.filter(u => {
    if (!u.invited_at || u.confirmed_at) return false
    const meta = u.user_metadata as Record<string, unknown> | null
    return meta?.tenant_id === id
  }).map(u => {
    const invitedAt = new Date(u.invited_at!)
    const hoursAgo = (now.getTime() - invitedAt.getTime()) / 3_600_000
    return { id: u.id, email: u.email ?? '', invitedAt, expired: hoursAgo > INVITE_EXPIRY_HOURS }
  })

  // ── Activity log ──────────────────────────────────────────────────────────
  const { data: logs } = await adminClient
    .from('tenant_audit_log')
    .select('id, event, details, created_at, actor_id')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const actorEmails = new Map(authUsers.map(u => [u.id, u.email ?? u.id]))

  const lp = tenant.license_plan as unknown as { name: string } | { name: string }[] | null
  const planName = (Array.isArray(lp) ? lp[0]?.name : lp?.name) ?? '—'

  const TABS = [
    { key: 'users',       label: t('tabUsers') },
    { key: 'activity',    label: t('tabActivity') },
    { key: 'impersonate', label: t('tabImpersonate') },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{tenant.name}</h2>
          <p className="text-xs text-gray-400 font-mono">{tenant.slug} · {planName}</p>
        </div>
        <Link href={`/superadmin/tenants/${id}/edit`}
          className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Editar
        </Link>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit mb-5">
        {TABS.map(item => (
          <Link key={item.key}
            href={`/superadmin/tenants/${id}?tab=${item.key}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === item.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{t('users.count', { n: profiles?.length ?? 0 })}</p>
            <form action={inviteAdmin} className="flex gap-2 items-center flex-wrap" noValidate>
              <input type="hidden" name="tenant_id" value={id} />
              <input
                name="email"
                type="email"
                placeholder="email@taller.com"
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 w-52"
              />
              <select name="role"
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="owner">👑 Dueño</option>
                <option value="shop_manager">🔧 Gerente</option>
              </select>
              <button type="submit"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors whitespace-nowrap">
                Invitar
              </button>
            </form>
          </div>
          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-xs font-semibold text-amber-700">
                  {pendingInvites.length === 1 ? '1 invitación pendiente' : `${pendingInvites.length} invitaciones pendientes`}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {pendingInvites.map(inv => (
                    <tr key={inv.id} className="border-b border-amber-100 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                            {inv.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700">{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        Enviada <LocalDate date={inv.invitedAt} options={{ day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }} />
                      </td>
                      <td className="px-5 py-3">
                        {inv.expired
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"/>Expirada</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>Pendiente</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <form action={resendInvite}>
                            <input type="hidden" name="user_id" value={inv.id} />
                            <input type="hidden" name="email" value={inv.email} />
                            <input type="hidden" name="tenant_id" value={id} />
                            <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                              Reenviar
                            </button>
                          </form>
                          <form action={revokeInvite}>
                            <input type="hidden" name="user_id" value={inv.id} />
                            <input type="hidden" name="tenant_id" value={id} />
                            <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                              Revocar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.user')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('users.table.email')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => {
                  const email = emailMap.get(p.id) ?? '—'
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: p.is_platform_admin ? '#FF7316' : '#6B7280' }}>
                            {(p.first_name?.[0] ?? email[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{email}</td>
                      <td className="px-5 py-3.5">
                        {p.activeHere
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Activo aquí
                            </span>
                          : <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />Otro taller activo
                            </span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <form action={resetUserPassword}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="email" value={email} />
                            <input type="hidden" name="tenant_id" value={id} />
                            <button type="submit"
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                              {t('users.resetPassword')}
                            </button>
                          </form>
                          <form action={removeMember}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="tenant_id" value={id} />
                            <button type="submit"
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                              Quitar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                      {t('users.noUsers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {(!logs || logs.length === 0)
            ? <p className="px-5 py-12 text-center text-sm text-gray-400">{t('activity.empty')}</p>
            : (
              <div className="divide-y divide-gray-50">
                {logs.map(log => {
                  const eventLabel = (t as unknown as (k: string) => string)(`activity.events.${log.event}`) ?? log.event
                  const actorEmail = log.actor_id ? actorEmails.get(log.actor_id) : null
                  const details = log.details as Record<string, unknown> | null
                  return (
                    <div key={log.id} className="px-5 py-3.5 flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{eventLabel}</p>
                        {details && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                            {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                        {actorEmail && <p className="text-xs text-gray-400 mt-0.5">por {actorEmail}</p>}
                      </div>
                      <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        <LocalDate date={log.created_at} />
                      </time>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ── IMPERSONATE TAB ── */}
      {tab === 'impersonate' && (
        <ImpersonatePanel
          tenantId={id}
          tenantName={tenant.name}
          users={(profiles ?? []).map(p => ({
            id: p.id,
            email: emailMap.get(p.id) ?? '',
            name: [p.first_name, p.last_name].filter(Boolean).join(' ') || (emailMap.get(p.id) ?? p.id),
          }))}
        />
      )}
    </div>
  )
}
