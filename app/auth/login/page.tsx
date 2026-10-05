import Link from 'next/link'
import { login } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('auth')

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('login.title')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('login.subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
          {(error.includes('expirado') || error.includes('expired') || error.includes('inv')) && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <a href="/auth/reset-password" className="font-medium underline">
                {t('login.requestLink')}
              </a>
            </div>
          )}
        </div>
      )}

      <form action={login} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('login.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            placeholder={t('login.emailPlaceholder')}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('login.password')}
            </label>
            <Link href="/auth/reset-password" className="text-xs text-slate-600 hover:underline">
              {t('login.forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            placeholder={t('login.passwordPlaceholder')}
          />
        </div>

        <button
          type="submit"
          className="w-full ark-btn-primary font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {t('login.submit')}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        {t('login.contactAdmin')}
      </p>
    </div>
  )
}
