import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('ARK_LOCALE')?.value ?? DEFAULT_LOCALE
  const locale: Locale = SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
