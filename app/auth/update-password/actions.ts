'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string
  const next     = (formData.get('next') as string | null) || null

  const errorBase = '/auth/update-password'
    + (next ? `?next=${encodeURIComponent(next)}&error=` : '?error=')

  if (password !== confirm) {
    redirect(errorBase + encodeURIComponent('Las contraseñas no coinciden'))
  }

  if (password.length < 8) {
    redirect(errorBase + encodeURIComponent('La contraseña debe tener al menos 8 caracteres'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(errorBase + encodeURIComponent(error.message))
  }

  redirect(next ?? '/dashboard')
}
