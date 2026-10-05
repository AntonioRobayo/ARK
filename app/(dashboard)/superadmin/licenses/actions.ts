'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createLicensePlan(formData: FormData) {
  const supabase = createAdminClient()

  const payload = {
    name:           formData.get('name') as string,
    slug:           (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
    description:    formData.get('description') as string || null,
    max_branches:   Number(formData.get('max_branches')),
    max_users:      Number(formData.get('max_users')),
    price_monthly:  Number(formData.get('price_monthly')),
    currency:       formData.get('currency') as string || 'COP',
    is_active:      true,
    sort_order:     Number(formData.get('sort_order') || 99),
  }

  const { error } = await supabase.from('license_plan').insert(payload)
  if (error) redirect('/superadmin/licenses/new?error=' + encodeURIComponent(error.message))
  redirect('/superadmin/licenses')
}

export async function updateLicensePlan(id: string, formData: FormData) {
  const supabase = createAdminClient()

  const payload = {
    name:           formData.get('name') as string,
    description:    formData.get('description') as string || null,
    max_branches:   Number(formData.get('max_branches')),
    max_users:      Number(formData.get('max_users')),
    price_monthly:  Number(formData.get('price_monthly')),
    currency:       formData.get('currency') as string || 'COP',
    is_active:      formData.get('is_active') === 'true',
    sort_order:     Number(formData.get('sort_order') || 99),
    updated_at:     new Date().toISOString(),
  }

  const { error } = await supabase.from('license_plan').update(payload).eq('id', id)
  if (error) redirect(`/superadmin/licenses/${id}?error=` + encodeURIComponent(error.message))
  redirect('/superadmin/licenses')
}
