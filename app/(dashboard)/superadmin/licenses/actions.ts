'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createLicensePlan(formData: FormData) {
  const supabase = createAdminClient()

  const minMonthly = Number(formData.get('min_monthly') || 0)
  const perBranch  = Number(formData.get('price_per_extra_branch') || 0)
  const payload = {
    name:                   formData.get('name') as string,
    slug:                   (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
    description:            formData.get('description') as string || null,
    min_users:              Number(formData.get('min_users') || 1),
    max_users:              Number(formData.get('max_users')),
    max_branches:           999,
    price_per_user:         Number(formData.get('price_per_user') || 0),
    min_monthly:            minMonthly > 0 ? minMonthly : null,
    price_per_extra_branch: perBranch > 0 ? perBranch : null,
    price_monthly:          0,
    currency:               'USD',
    is_active:              true,
    sort_order:             Number(formData.get('sort_order') || 99),
  }

  const { error } = await supabase.from('license_plan').insert(payload)
  if (error) redirect('/superadmin/licenses/new?error=' + encodeURIComponent(error.message))
  redirect('/superadmin/licenses')
}

export async function updateLicensePlan(id: string, formData: FormData) {
  const supabase = createAdminClient()

  const minMonthly2 = Number(formData.get('min_monthly') || 0)
  const perBranch2  = Number(formData.get('price_per_extra_branch') || 0)
  const payload = {
    name:                   formData.get('name') as string,
    description:            formData.get('description') as string || null,
    min_users:              Number(formData.get('min_users') || 1),
    max_users:              Number(formData.get('max_users')),
    max_branches:           999,
    price_per_user:         Number(formData.get('price_per_user') || 0),
    min_monthly:            minMonthly2 > 0 ? minMonthly2 : null,
    price_per_extra_branch: perBranch2 > 0 ? perBranch2 : null,
    price_monthly:          0,
    currency:               'USD',
    is_active:              formData.get('is_active') === 'true',
    sort_order:             Number(formData.get('sort_order') || 99),
    updated_at:             new Date().toISOString(),
  }

  const { error } = await supabase.from('license_plan').update(payload).eq('id', id)
  if (error) redirect(`/superadmin/licenses/${id}?error=` + encodeURIComponent(error.message))
  redirect('/superadmin/licenses')
}
