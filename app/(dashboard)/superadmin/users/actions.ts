'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function sendRecoveryLink(formData: FormData) {
  const adminClient = createAdminClient()
  const email = formData.get('email') as string

  const { error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) {
    redirect(`/superadmin/users?error=${encodeURIComponent(error.message)}`)
  }
  redirect(`/superadmin/users?success=${encodeURIComponent(`Link de recuperación enviado a ${email}`)}`)
}
