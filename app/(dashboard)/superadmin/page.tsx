import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleTenantStatus } from './tenants/[id]/actions'
import { getTranslations } from 'next-intl/server'

const PLAN_COLORS: Record<string, string> = {
  starter:      'bg-gray-100 text-gray-600',
  professional: 'bg-blue-50 text-blue-600',
  enterprise:   'bg-purple-50 text-purple-600',
}

function PlanBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[slug] ?? 'bg-gray-100 text-gray-600'}`}>
      {name}
    </span>
  )
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
    .select('id, name, slug, plan, plan_id, plan_expires_at, is_active, created_at, license_plan(name, slug)')
    .order('created_at', { ascending: false })

  const t = await getTranslations('superadmin')

  function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
    if (!expiresAt) return <span className="text-xs text-gray-400">{t('workshops.noExpiry')}</span>
    const date = new Date(expiresAt)
    const now = new Date()
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
    <div>
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

      <div className="flex items-center justify-between mb-4">
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
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.license')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.status')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.table.created')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants?.map((tenant) => {
              const lp = tenant.license_plan as unknown as { name: string; slug: string } | null
              return (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{tenant.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{tenant.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {lp
                      ? <PlanBadge name={lp.name} slug={lp.slug} />
                      : <PlanBadge name={tenant.plan ?? '—'} slug={tenant.plan ?? ''} />
                    }
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
                    <div className="flex items-center gap-2 justify-end">
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
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">{t('workshops.empty')}</p>
                  <p className="text-xs mt-1 text-gray-300">{t('workshops.emptyHint')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
