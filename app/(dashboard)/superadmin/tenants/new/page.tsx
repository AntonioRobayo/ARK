import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewTenantWizard } from './wizard'

export default async function NewTenantPage() {
  const supabase = await createClient()

  const [{ data: plans }, { data: countries }] = await Promise.all([
    supabase
      .from('license_plan')
      .select('id, name, description, max_branches, max_users, price_monthly, currency')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('countries')
      .select('code, name, currency, timezone')
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

      <NewTenantWizard plans={plans ?? []} countries={countries ?? []} />
    </div>
  )
}
