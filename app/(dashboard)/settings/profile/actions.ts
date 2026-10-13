'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim() ?? ''
  const phone     = (formData.get('phone') as string)?.trim() ?? ''

  if (!firstName) {
    redirect('/settings/profile?error=' + encodeURIComponent('El nombre es requerido'))
  }

  const { error } = await supabase
    .from('user_profile')
    .update({ first_name: firstName, last_name: lastName, phone: phone || null })
    .eq('id', user.id)

  if (error) {
    redirect('/settings/profile?error=' + encodeURIComponent(error.message))
  }

  redirect('/settings/profile?success=1')
}
