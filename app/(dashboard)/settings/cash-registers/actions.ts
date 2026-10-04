'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function upsertCashRegister(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id, branch_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const id = formData.get('id') as string | null
  const data = {
    tenant_id: profile.tenant_id,
    branch_id: profile.branch_id || null,
    name: (formData.get('name') as string).trim(),
    is_active: true,
  }

  if (id) {
    await supabase.from('cash_register').update(data).eq('id', id)
  } else {
    await supabase.from('cash_register').insert(data)
  }

  revalidatePath('/settings/cash-registers')
  redirect('/settings/cash-registers')
}

export async function toggleCashRegister(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const current = formData.get('is_active') === 'true'
  await supabase.from('cash_register').update({ is_active: !current }).eq('id', id)
  revalidatePath('/settings/cash-registers')
  redirect('/settings/cash-registers')
}
