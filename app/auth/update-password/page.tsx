import Link from 'next/link'
import { updatePassword } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>
}) {
  const { error, from } = await searchParams
  const backHref = from === 'settings' ? '/settings' : '/dashboard'
  const t = await getTranslations('auth')

  const ERROR_MESSAGES: Record<string, string> = {
    'New password should be different from the old password.': t('updatePassword.errors.samePassword'),
    'Password should be at least 6 characters.': t('updatePassword.errors.tooShort'),
    'Auth session missing!': t('updatePassword.errors.sessionExpired'),
  }

  function translateError(raw: string): string {
    return ERROR_MESSAGES[raw] ?? raw
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('updatePassword.back')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">{t('updatePassword.title')}</h2>
          <p className="text-gray-500 text-sm">{t('updatePassword.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {translateError(decodeURIComponent(error))}
        </div>
      )}

      <form action={updatePassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('updatePassword.newPassword')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            placeholder={t('updatePassword.newPasswordPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
            {t('updatePassword.confirmPassword')}
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            placeholder={t('updatePassword.confirmPasswordPlaceholder')}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {t('updatePassword.submit')}
        </button>
      </form>
    </div>
  )
}
