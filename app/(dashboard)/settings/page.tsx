import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const sections = [
    { href: '/settings/services',                title: t('cards.services'),       description: t('cards.servicesDesc'),       icon: '🔧' },
    { href: '/settings/taxes',                   title: t('cards.taxes'),          description: t('cards.taxesDesc'),          icon: '📊' },
    { href: '/settings/payment-methods',         title: t('cards.paymentMethods'), description: t('cards.paymentMethodsDesc'), icon: '💳' },
    { href: '/settings/cash-registers',          title: t('cards.cashRegisters'),  description: t('cards.cashRegistersDesc'),  icon: '🏧' },
    { href: '/auth/update-password?from=settings', title: t('cards.password'),     description: t('cards.passwordDesc'),       icon: '🔑' },
    { href: '/settings/language',                title: t('cards.language'),       description: t('cards.languageDesc'),       icon: '🌐' },
  ]

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('workshop')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="text-2xl mb-3">{s.icon}</div>
            <p className="font-semibold text-gray-900 group-hover:text-slate-700">{s.title}</p>
            <p className="text-sm text-gray-400 mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
