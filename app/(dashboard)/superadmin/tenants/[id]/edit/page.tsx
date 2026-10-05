import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { updateTenant } from '../actions'
import { getTranslations } from 'next-intl/server'

export default async function EditTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: tenant }, { data: plans }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, slug, plan, plan_id, plan_expires_at, is_active, country_code, currency_code, timezone')
      .eq('id', id)
      .single(),
    supabase
      .from('license_plan')
      .select('id, name, slug, max_branches, max_users, price_monthly, currency')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!tenant) redirect('/superadmin')

  const updateWithId = updateTenant.bind(null, id)
  const expiryValue = tenant.plan_expires_at
    ? new Date(tenant.plan_expires_at).toISOString().slice(0, 10)
    : ''
  const t = await getTranslations('superadmin')

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">{t('workshops.edit.title', { name: tenant.name })}</h2>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={updateWithId} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('workshops.edit.name')}</label>
          <input name="name" type="text" required defaultValue={tenant.name}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('workshops.edit.country')}</label>
            <input name="country_code" type="text" maxLength={2} defaultValue={tenant.country_code ?? 'CO'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('workshops.edit.currency')}</label>
            <input name="currency_code" type="text" maxLength={3} defaultValue={tenant.currency_code ?? 'COP'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('workshops.edit.timezone')}</label>
          <input name="timezone" type="text" defaultValue={tenant.timezone ?? 'America/Bogota'}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('workshops.edit.licenseSection')}</p>

        <div className="space-y-2">
          {plans?.map(plan => (
            <label key={plan.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-orange-300 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <input type="radio" name="plan_id" value={plan.id} required
                  defaultChecked={plan.id === tenant.plan_id}
                  className="accent-orange-500 w-4 h-4" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{plan.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plan.max_branches === 999 ? t('workshops.new.unlimitedBranches') : plan.max_branches !== 1 ? t('workshops.new.branchesPlural', { n: plan.max_branches }) : t('workshops.new.branches', { n: plan.max_branches })}
                    {' · '}
                    {plan.max_users === 999 ? t('workshops.new.unlimitedUsers') : t('workshops.new.usersPlural', { n: plan.max_users })}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-700">
                {Number(plan.price_monthly) > 0
                  ? `$${Number(plan.price_monthly).toLocaleString('es-CO')} ${plan.currency}/mes`
                  : <span className="text-gray-400 font-normal text-xs">{t('workshops.new.noPrice')}</span>}
              </span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('workshops.edit.expiry')}
            <span className="ml-1 font-normal text-gray-400">{t('workshops.edit.expiryHint')}</span>
          </label>
          <input name="plan_expires_at" type="date" defaultValue={expiryValue}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>

        <button type="submit"
          className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}>
          {t('workshops.edit.save')}
        </button>
      </form>
    </div>
  )
}
