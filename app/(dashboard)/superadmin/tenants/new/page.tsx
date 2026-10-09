import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewTenantWizard } from './wizard'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: plans }, { data: countries }, { data: currencies }] = await Promise.all([
    supabase
      .from('license_plan')
      .select('id, name, description, min_users, max_users, price_monthly, price_per_user, min_monthly, price_per_extra_branch, currency')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('countries')
      .select('code, name, currency, timezone')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('currencies')
      .select('code, name')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">Nuevo taller</h2>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      <NewTenantWizard plans={plans ?? []} countries={countries ?? []} currencies={currencies ?? []} />
    </div>
  )
}
