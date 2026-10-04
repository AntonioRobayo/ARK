'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ark-delta-lovat.vercel.app'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    redirect('/auth/reset-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/auth/reset-password?sent=1')
}
