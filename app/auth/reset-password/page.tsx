import { requestPasswordReset } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { sent, error } = await searchParams
  const t = await getTranslations('auth')

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FFF7ED' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('resetPassword.sentTitle')}</h2>
        <p className="text-gray-500 text-sm">
          {t('resetPassword.sentMessage')}
        </p>
        <a href="/auth/login" className="mt-6 inline-block text-sm font-medium" style={{ color: '#FF7316' }}>
          {t('resetPassword.backToLogin')}
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('resetPassword.title')}</h2>
      <p className="text-gray-500 text-sm mb-6">
        {t('resetPassword.subtitle')}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={requestPasswordReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('resetPassword.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
            placeholder={t('resetPassword.emailPlaceholder')}
          />
        </div>

        <button
          type="submit"
          className="w-full ark-btn-primary font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {t('resetPassword.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-xs">
        <a href="/auth/login" className="text-gray-400 hover:underline">
          {t('resetPassword.backToLogin')}
        </a>
      </p>
    </div>
  )
}
