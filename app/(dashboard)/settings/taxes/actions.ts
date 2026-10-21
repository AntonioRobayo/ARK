'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function upsertTaxRate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const id = formData.get('id') as string | null
  const isDefault = formData.get('is_default') === 'on'

  if (isDefault) {
    await adminClient.from('tax_rate').update({ is_default: false })
      .eq('tenant_id', profile.tenant_id)
  }

  const data = {
    tenant_id: profile.tenant_id,
    name: (formData.get('name') as string).trim(),
    rate: Number(formData.get('rate') ?? 0),
    is_default: isDefault,
    is_active: true,
  }

  if (id) {
    await adminClient.from('tax_rate').update(data).eq('id', id)
  } else {
    await adminClient.from('tax_rate').insert(data)
  }

  revalidatePath('/settings/taxes')
  redirect('/settings/taxes')
}

export async function toggleTaxRate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const id = formData.get('id') as string
  const current = formData.get('is_active') === 'true'
  await adminClient.from('tax_rate').update({ is_active: !current }).eq('id', id)
  revalidatePath('/settings/taxes')
  redirect('/settings/taxes')
}
