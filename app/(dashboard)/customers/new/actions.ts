'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    redirect('/customers/new?error=' + encodeURIComponent('Sin tenant configurado'))
  }

  const { data: customer, error } = await supabase
    .from('customer')
    .insert({
      tenant_id:  profile.tenant_id,
      first_name: (formData.get('first_name') as string).trim(),
      last_name:  (formData.get('last_name') as string)?.trim() || null,
      id_type:    (formData.get('id_type') as string) || null,
      id_number:  (formData.get('id_number') as string)?.trim() || null,
      phone:      (formData.get('phone') as string)?.trim() || null,
      email:      (formData.get('email') as string)?.trim() || null,
      address:    (formData.get('address') as string)?.trim() || null,
      notes:      (formData.get('notes') as string)?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !customer) {
    redirect('/customers/new?error=' + encodeURIComponent(error?.message ?? 'Error al registrar cliente'))
  }

  const redirectTo = formData.get('redirect_to') as string
  if (redirectTo) redirect(redirectTo)
  redirect(`/customers/${customer.id}`)
}
