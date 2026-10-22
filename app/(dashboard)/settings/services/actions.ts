'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function upsertService(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const id = formData.get('id') as string | null
  const data = {
    tenant_id: profile.tenant_id,
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    category: (formData.get('category') as string)?.trim() || null,
    base_price: Number(formData.get('base_price') ?? 0),
    estimated_minutes: formData.get('estimated_minutes') ? Number(formData.get('estimated_minutes')) : null,
    warranty_days: formData.get('warranty_days') ? Number(formData.get('warranty_days')) : null,
    is_active: true,
  }

  if (id) {
    await adminClient.from('service_catalog').update(data).eq('id', id)
  } else {
    await adminClient.from('service_catalog').insert(data)
  }

  revalidatePath('/settings/services')
}

export async function toggleService(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const id = formData.get('id') as string
  const current = formData.get('is_active') === 'true'
  await adminClient.from('service_catalog').update({ is_active: !current }).eq('id', id)
  revalidatePath('/settings/services')
}
