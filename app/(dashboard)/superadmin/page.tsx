import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleTenantStatus, extendLicense } from './tenants/[id]/actions'
import { getTranslations } from 'next-intl/server'
import { calculateMonthly, formatUSD } from '@/lib/billing'

type LicensePlan = {
  name: string
  slug: string
  price_per_user: number | null
  min_monthly: number | null
  price_per_extra_branch: number | null
}

type Tenant = {
  id: string
  name: string
  slug: string
  plan: string
  plan_id: string | null
  plan_expires_at: string | null
  is_active: boolean
  created_at: string
  contracted_users: number
  contracted_branches: number
  license_plan: LicensePlan | LicensePlan[] | null
}

function resolvePlan(lp: Tenant['license_plan']): LicensePlan | null {
  if (!lp) return null
  return Array.isArray(lp) ? (lp[0] ?? null) : lp
}

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, plan_id, plan_expires_at, is_active, created_at, contracted_users, contracted_branches, license_plan(name, slug, price_per_user, min_monthly, price_per_extra_branch)')
    .order('created_at', { ascending: false })

  const t = await getTranslations('superadmin')
  const now = new Date()

  // ─── Métricas ────────────────────────────────────────────────────────────────

  const all = (tenants ?? []) as Tenant[]
  const active = all.filter(t => t.is_active)

  const estimatedMRR = active.reduce((sum, tenant) => {
    const plan = resolvePlan(tenant.license_plan)
    if (!plan?.price_per_user) return sum
    const billing = calculateMonthly(plan, tenant.contracted_users ?? 1, tenant.contracted_branches ?? 1)
    return sum + billing.total
  }, 0)

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = active.filter(t => {
    if (!t.plan_expires_at) return false
    const d = new Date(t.plan_expires_at)
    return d >= now && d <= thirtyDaysFromNow
  })

  const gracePeriod = active.filter(t => {
    if (!t.plan_expires_at) return false
    const d = new Date(t.plan_expires_at)
    const graceEnd = new Date(d.getTime() + 3 * 24 * 60 * 60 * 1000)
    return d < now && graceEnd >= now
  })

  // ─── Helpers de UI ───────────────────────────────────────────────────────────

  function QuickExtend({ tenantId, compact = false }: { tenantId: string; compact?: boolean }) {
    const opts = compact
      ? [{ days: 30, label: '+30d' }, { days: 90, label: '+90d' }, { days: 365, label: '+1a' }]
      : [{ days: 30, label: '+30 días' }, { days: 90, label: '+90 días' }, { days: 365, label: '+1 año' }]
    return (
      <div className="flex items-center gap-1">
        {opts.map(({ days, label }) => (
          <form key={days} action={extendLicense}>
            <input type="hidden" name="id" value={tenantId} />
            <input type="hidden" name="days" value={String(days)} />
            <button type="submit"
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 transition-colors whitespace-nowrap">
              {label}
            </button>
          </form>
        ))}
      </div>
    )
  }

  function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
    if (!expiresAt) return <span className="text-xs text-gray-400">{t('workshops.noExpiry')}</span>
    const date = new Date(expiresAt)
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isExpired = daysLeft < 0
    const isWarning = daysLeft >= 0 && daysLeft <= 14

    return (
      <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-500'}`}>
        {isExpired
          ? t('workshops.expiredDays', { n: Math.abs(daysLeft) })
          : isWarning
            ? t('workshops.expiresSoon', { n: daysLeft })
            : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Talleres activos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{active.length}</p>
          <p className="text-xs text-gray-400 mt-1">de {all.length} registrados</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">MRR estimado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatUSD(estimatedMRR)}</p>
          <p className="text-xs text-gray-400 mt-1">planes con pricing dinámico</p>
        </div>
        <Link href="#expiring" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Por vencer (30d)</p>
          <p className={`text-3xl font-bold mt-1 ${expiringSoon.length > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
            {expiringSoon.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">requieren atención</p>
        </Link>
        <Link href="#grace" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Período de gracia</p>
          <p className={`text-3xl font-bold mt-1 ${gracePeriod.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
            {gracePeriod.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">vencidos, sin bloquear</p>
        </Link>
      </div>

      {/* ── Alertas ── */}
      {(gracePeriod.length > 0 || expiringSoon.length > 0) && (
        <div className="space-y-3">
          {gracePeriod.length > 0 && (
            <div id="grace" className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">
                🔒 En período de gracia — acceso bloqueado en breve
              </p>
              <div className="space-y-2">
                {gracePeriod.map(tenant => {
                  const daysExpired = Math.abs(Math.ceil((new Date(tenant.plan_expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                  return (
                    <div key={tenant.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-red-900">{tenant.name}</span>
                        <span className="text-xs text-red-500 ml-2">vencida hace {daysExpired} día{daysExpired !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <QuickExtend tenantId={tenant.id} />
                        <Link href={`/superadmin/tenants/${tenant.id}/edit`}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors font-medium">
                          Editar
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div id="expiring" className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                ⏰ Licencias por vencer (próximos 30 días)
              </p>
              <div className="space-y-2">
                {expiringSoon.map(tenant => {
                  const daysLeft = Math.ceil((new Date(tenant.plan_expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={tenant.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-amber-900">{tenant.name}</span>
                        <span className="text-xs text-amber-600 ml-2">vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <QuickExtend tenantId={tenant.id} />
                        <Link href={`/superadmin/tenants/${tenant.id}/edit`}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors font-medium">
                          Editar
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de talleres ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{t('workshops.count', { n: tenants?.length ?? 0 })}</p>
          <Link
            href="/superadmin/tenants/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('workshops.newBtn')}
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.workshop')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.plan')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">MRR</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.license')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.status')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.created')}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {all.map((tenant) => {
                const lp = resolvePlan(tenant.license_plan)
                const billing = lp?.price_per_user
                  ? calculateMonthly(
                      { price_per_user: lp.price_per_user, min_monthly: lp.min_monthly, price_per_extra_branch: lp.price_per_extra_branch },
                      tenant.contracted_users ?? 1,
                      tenant.contracted_branches ?? 1
                    )
                  : null

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{tenant.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                        {lp?.name ?? tenant.plan ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">
                      {billing ? formatUSD(billing.total) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><ExpiryBadge expiresAt={tenant.plan_expires_at} /></td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tenant.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {tenant.is_active ? t('workshops.active') : t('workshops.inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(tenant.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <QuickExtend tenantId={tenant.id} compact />
                        <Link
                          href={`/superadmin/tenants/${tenant.id}/edit`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          {t('workshops.editBtn')}
                        </Link>
                        <form action={toggleTenantStatus}>
                          <input type="hidden" name="id" value={tenant.id} />
                          <input type="hidden" name="is_active" value={String(tenant.is_active)} />
                          <button
                            type="submit"
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                              tenant.is_active
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {tenant.is_active ? t('workshops.deactivate') : t('workshops.activate')}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {all.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-sm text-gray-400">{t('workshops.empty')}</p>
                    <p className="text-xs mt-1 text-gray-300">{t('workshops.emptyHint')}</p>
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
