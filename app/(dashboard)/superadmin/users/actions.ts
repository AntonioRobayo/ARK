'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { sendPasswordResetEmail } from '@/lib/email'

export async function sendRecoveryLink(formData: FormData) {
  const adminClient = createAdminClient()
  const email = formData.get('email') as string

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/recovery`

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: callbackUrl },
  })

  if (error) {
    redirect(`/superadmin/users?error=${encodeURIComponent(error.message)}`)
  }

  const resetUrl = data?.properties?.action_link
  if (!resetUrl) {
    redirect(`/superadmin/users?error=${encodeURIComponent('No se pudo generar el link de recuperación')}`)
  }

  try {
    await sendPasswordResetEmail({ to: email, resetUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al enviar email'
    redirect(`/superadmin/users?error=${encodeURIComponent(msg)}`)
  }

  redirect(`/superadmin/users?success=${encodeURIComponent(`Link de recuperación enviado a ${email}`)}`)
}
