'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const firstName = formData.get('first_name') as string
  const lastName  = formData.get('last_name') as string
  const tenantId  = formData.get('tenant_id') as string

  const { error } = await supabase.rpc('complete_onboarding', {
    p_tenant_id:   tenantId,
    p_first_name:  firstName,
    p_last_name:   lastName,
  })

  if (error) {
    redirect(`/onboarding?tenant_id=${tenantId}&error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}
