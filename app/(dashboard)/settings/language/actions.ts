'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/request'

export async function updateLocale(formData: FormData) {
  const raw = formData.get('locale') as string
  const locale: Locale = SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'es'

  const cookieStore = await cookies()
  cookieStore.set('ARK_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('user_profile')
      .update({ locale })
      .eq('id', user.id)
  }

  redirect('/settings/language?saved=1')
}
