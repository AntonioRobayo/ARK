import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { updateLocale } from './actions'
import { SUPPORTED_LOCALES } from '@/i18n/request'

const LOCALE_META: Record<string, { native: string; flag: string }> = {
  es: { native: 'Español',   flag: '🇪🇸' },
  en: { native: 'English',   flag: '🇬🇧' },
  pt: { native: 'Português', flag: '🇧🇷' },
}

export default async function LanguagePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams
  const cookieStore = await cookies()
  const current = cookieStore.get('ARK_LOCALE')?.value ?? 'es'
  const t = await getTranslations('settings.language')

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">{t('back')}</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('title')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('label')}</p>

      {saved && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {t('saved')}
        </div>
      )}

      <form action={updateLocale}>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-4">
          {SUPPORTED_LOCALES.map(locale => {
            const meta = LOCALE_META[locale]
            const isActive = current === locale
            return (
              <label key={locale} className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="locale"
                  value={locale}
                  defaultChecked={isActive}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-xl">{meta.flag}</span>
                <p className="font-medium text-gray-900">{meta.native}</p>
                {isActive && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                    ✓
                  </span>
                )}
              </label>
            )
          })}
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}
        >
          {t('save')}
        </button>
      </form>
    </div>
  )
}
