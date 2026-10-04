'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function upsertPaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const id = formData.get('id') as string | null
  const data = {
    tenant_id: profile.tenant_id,
    name: (formData.get('name') as string).trim(),
    type: (formData.get('type') as string) || 'other',
    is_active: true,
  }

  if (id) {
    await supabase.from('payment_method').update(data).eq('id', id)
  } else {
    await supabase.from('payment_method').insert(data)
  }

  revalidatePath('/settings/payment-methods')
  redirect('/settings/payment-methods')
}

export async function togglePaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const current = formData.get('is_active') === 'true'
  await supabase.from('payment_method').update({ is_active: !current }).eq('id', id)
  revalidatePath('/settings/payment-methods')
  redirect('/settings/payment-methods')
}
