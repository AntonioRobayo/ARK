'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (password !== confirm) {
    redirect('/auth/update-password?error=' + encodeURIComponent('Las contraseñas no coinciden'))
  }

  if (password.length < 8) {
    redirect('/auth/update-password?error=' + encodeURIComponent('La contraseña debe tener al menos 8 caracteres'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect('/auth/update-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard')
}
