import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import { toggleCountry, addCountry, toggleCurrency, addCurrency } from './actions'

type SearchParams = Promise<{ tab?: string; add?: string; error?: string }>

export default async function CatalogsPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab = 'countries', add, error } = await searchParams
  const supabase = createAdminClient()
  const t = await getTranslations('superadmin.catalogs')

  const [{ data: countries }, { data: currencies }] = await Promise.all([
    supabase.from('countries').select('code, name, currency, timezone, is_active').order('sort_order'),
    supabase.from('currencies').select('code, name, is_active').order('sort_order'),
  ])

  const activeTab = tab === 'currencies' ? 'currencies' : 'countries'
  const showAdd = add === '1'

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit mb-6">
        {(['countries', 'currencies'] as const).map(k => (
          <a
            key={k}
            href={`/superadmin/catalogs?tab=${k}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === k
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {t(`tabs.${k}`)}
          </a>
        ))}
      </div>

      {/* Error flash */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {activeTab === 'countries' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{t('countries.count', { n: countries?.length ?? 0 })}</p>
            <a
              href="/superadmin/catalogs?tab=countries&add=1"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: '#FF7316' }}
            >
              {t('countries.addBtn')}
            </a>
          </div>

          {showAdd && (
            <div className="mb-4 bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('countries.add.title')}</h3>
              <form action={addCountry} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('countries.add.code')}</label>
                  <input name="code" placeholder={t('countries.add.codePlaceholder')} maxLength={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('countries.add.name')}</label>
                  <input name="name" placeholder={t('countries.add.namePlaceholder')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('countries.add.currency')}</label>
                  <input name="currency" placeholder={t('countries.add.currencyPlaceholder')} maxLength={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('countries.add.timezone')}</label>
                  <input name="timezone" placeholder={t('countries.add.timezonePlaceholder')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div className="col-span-2 flex gap-3 justify-end">
                  <a href="/superadmin/catalogs?tab=countries" className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </a>
                  <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#FF7316' }}>
                    {t('countries.add.submit')}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('countries.code')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('countries.name')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('countries.currency')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('countries.timezone')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('countries.status')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {countries?.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-700">{c.code}</td>
                    <td className="px-5 py-3.5 text-gray-900">{c.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{c.currency}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{c.timezone}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {c.is_active ? t('countries.active') : t('countries.inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={toggleCountry.bind(null, c.code, c.is_active)}>
                        <button type="submit" className="text-xs font-medium transition-colors hover:underline"
                          style={{ color: c.is_active ? '#EF4444' : '#FF7316' }}>
                          {c.is_active ? t('countries.deactivate') : t('countries.activate')}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {(!countries || countries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                      {t('countries.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'currencies' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{t('currencies.count', { n: currencies?.length ?? 0 })}</p>
            <a
              href="/superadmin/catalogs?tab=currencies&add=1"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: '#FF7316' }}
            >
              {t('currencies.addBtn')}
            </a>
          </div>

          {showAdd && (
            <div className="mb-4 bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('currencies.add.title')}</h3>
              <form action={addCurrency} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currencies.add.code')}</label>
                  <input name="code" placeholder={t('currencies.add.codePlaceholder')} maxLength={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currencies.add.name')}</label>
                  <input name="name" placeholder={t('currencies.add.namePlaceholder')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                    required />
                </div>
                <div className="col-span-2 flex gap-3 justify-end">
                  <a href="/superadmin/catalogs?tab=currencies" className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </a>
                  <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#FF7316' }}>
                    {t('currencies.add.submit')}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('currencies.code')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('currencies.name')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('currencies.status')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {currencies?.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-700">{c.code}</td>
                    <td className="px-5 py-3.5 text-gray-900">{c.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {c.is_active ? t('currencies.active') : t('currencies.inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={toggleCurrency.bind(null, c.code, c.is_active)}>
                        <button type="submit" className="text-xs font-medium transition-colors hover:underline"
                          style={{ color: c.is_active ? '#EF4444' : '#FF7316' }}>
                          {c.is_active ? t('currencies.deactivate') : t('currencies.activate')}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {(!currencies || currencies.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                      {t('currencies.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
