import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EditTenantWizard } from './wizard'

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tenant }, { data: plans }, { data: countries }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, slug, plan, plan_id, plan_expires_at, is_active, country_code, currency_code, timezone')
      .eq('id', id)
      .single(),
    supabase
      .from('license_plan')
      .select('id, name, description, slug, max_branches, max_users, price_monthly, currency')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('countries')
      .select('code, name, currency, timezone')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!tenant) redirect('/superadmin')

  const t = await getTranslations('superadmin.workshops.edit')

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">{t('title', { name: tenant.name })}</h2>
      </div>

      <EditTenantWizard tenant={tenant} plans={plans ?? []} countries={countries ?? []} />
    </div>
  )
}
