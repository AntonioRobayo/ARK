'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendMagicLink(
  _prevState: { sent: boolean; error: string | null },
  formData: FormData
): Promise<{ sent: boolean; error: string | null }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { sent: false, error: 'Ingresa un correo válido.' }
  }

  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback?next=/portal`,
    },
  })

  if (error) {
    return { sent: false, error: 'No pudimos enviar el enlace. Intenta de nuevo.' }
  }

  return { sent: true, error: null }
}
