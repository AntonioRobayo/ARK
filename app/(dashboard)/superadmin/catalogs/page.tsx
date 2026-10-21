import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import { toggleCountry, addCountry, toggleCurrency, addCurrency, updateCurrencyRate, addCatalogEntry, toggleCatalogEntry, updateCatalogEntry } from './actions'

type SearchParams = Promise<{ tab?: string; add?: string; edit_rate?: string; error?: string; cat?: string; edit?: string }>

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_type: 'Tipos de vehículo',
  fuel_type: 'Tipos de combustible',
  fuel_level: 'Niveles de combustible',
  document_type: 'Tipos de documento',
  inventory_item_type: 'Tipos de ítem (inventario)',
  vehicle_brand: 'Marcas de vehículo',
}

export default async function CatalogsPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab = 'countries', add, edit_rate, error, cat = 'vehicle_type', edit } = await searchParams
  const supabase = createAdminClient()
  const t = await getTranslations('superadmin.catalogs')

  const [{ data: countries }, { data: currencies }, { data: catalogEntries }] = await Promise.all([
    supabase.from('countries').select('code, name, currency, timezone, is_active').order('name'),
    supabase.from('currencies').select('code, name, is_active, usd_rate').order('sort_order'),
    supabase.from('global_catalog').select('id, category, value, label_es, label_en, sort_order, is_system, is_active').order('sort_order'),
  ])

  const activeTab = tab === 'currencies' ? 'currencies' : tab === 'app_catalogs' ? 'app_catalogs' : 'countries'
  const showAdd = add === '1'
  const activeCat = cat in CATEGORY_LABELS ? cat : 'vehicle_type'
  const catEntries = (catalogEntries ?? []).filter(e => e.category === activeCat)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit mb-6">
        {(['countries', 'currencies', 'app_catalogs'] as const).map(k => (
          <a
            key={k}
            href={`/superadmin/catalogs?tab=${k}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === k
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {k === 'app_catalogs' ? 'Catálogos de app' : t(`tabs.${k}`)}
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currencies.usdRate')} <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input name="usd_rate" type="number" step="0.01" min="0" placeholder="ej. 4100"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('currencies.usdRate')}</th>
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
                      {edit_rate === c.code ? (
                        <form action={updateCurrencyRate.bind(null, c.code)} className="flex items-center gap-2">
                          <input
                            name="usd_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={c.usd_rate ?? ''}
                            placeholder="ej. 4100"
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1"
                            style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties}
                          />
                          <button type="submit" className="text-xs font-semibold text-white px-2 py-1 rounded" style={{ backgroundColor: '#FF7316' }}>✓</button>
                          <a href="/superadmin/catalogs?tab=currencies" className="text-xs text-gray-400 hover:text-gray-600">✕</a>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">
                            {c.usd_rate ? `${Number(c.usd_rate).toLocaleString('es-CO')}` : <span className="text-gray-300 text-xs">—</span>}
                          </span>
                          <a href={`/superadmin/catalogs?tab=currencies&edit_rate=${c.code}`}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                            ✎
                          </a>
                        </div>
                      )}
                    </td>
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

      {activeTab === 'app_catalogs' && (
        <section>
          <div className="flex gap-6">
            {/* Category sidebar */}
            <div className="w-52 shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Categoría</p>
              <nav className="space-y-0.5">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <a
                    key={key}
                    href={`/superadmin/catalogs?tab=app_catalogs&cat=${key}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeCat === key
                        ? 'bg-gray-900 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Entries table */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{CATEGORY_LABELS[activeCat]}</h3>
                <a
                  href={`/superadmin/catalogs?tab=app_catalogs&cat=${activeCat}&add=1`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: '#FF7316' }}
                >
                  + Agregar
                </a>
              </div>

              {showAdd && (
                <div className="mb-4 bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Nuevo valor</h4>
                  <form action={addCatalogEntry} className="grid grid-cols-2 gap-4">
                    <input type="hidden" name="category" value={activeCat} />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor (clave interna)</label>
                      <input name="value" placeholder="ej. electric_scooter" required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta español</label>
                      <input name="label_es" placeholder="ej. Scooter eléctrico" required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta inglés</label>
                      <input name="label_en" placeholder="ej. Electric scooter"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                      <input name="sort_order" type="number" defaultValue="99"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                    </div>
                    <div className="col-span-2 flex gap-3 justify-end">
                      <a href={`/superadmin/catalogs?tab=app_catalogs&cat=${activeCat}`} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </a>
                      <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#FF7316' }}>
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Etiqueta ES</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Etiqueta EN</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Orden</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {catEntries.map(e => (
                      <>
                        <tr key={e.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: edit === e.id ? 'none' : '1px solid #F9FAFB' }}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">
                            {e.value}
                            {e.is_system && <span className="ml-1.5 px-1 py-0.5 rounded text-[10px] bg-gray-100 text-gray-400">sistema</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{e.label_es}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{e.label_en ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{e.sort_order}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              e.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {e.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-3 justify-end">
                              <a
                                href={edit === e.id
                                  ? `/superadmin/catalogs?tab=app_catalogs&cat=${activeCat}`
                                  : `/superadmin/catalogs?tab=app_catalogs&cat=${activeCat}&edit=${e.id}`}
                                className="text-xs font-medium text-gray-500 hover:underline transition-colors"
                              >
                                {edit === e.id ? 'Cancelar' : 'Editar'}
                              </a>
                              <form action={toggleCatalogEntry.bind(null, e.id, e.is_active)}>
                                <button type="submit" className="text-xs font-medium transition-colors hover:underline"
                                  style={{ color: e.is_active ? '#EF4444' : '#FF7316' }}>
                                  {e.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                        {edit === e.id && (
                          <tr key={`${e.id}-edit`} style={{ borderBottom: '1px solid #F9FAFB' }}>
                            <td colSpan={6} className="px-4 py-4 bg-orange-50">
                              <form action={updateCatalogEntry} className="grid grid-cols-4 gap-3 items-end">
                                <input type="hidden" name="id" value={e.id} />
                                <input type="hidden" name="category" value={activeCat} />
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta español</label>
                                  <input name="label_es" defaultValue={e.label_es} required
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 bg-white"
                                    style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta inglés</label>
                                  <input name="label_en" defaultValue={e.label_en ?? ''}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 bg-white"
                                    style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                                  <input name="sort_order" type="number" defaultValue={e.sort_order}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 bg-white"
                                    style={{ '--tw-ring-color': '#FF7316' } as React.CSSProperties} />
                                </div>
                                <button type="submit" className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
                                  style={{ backgroundColor: '#FF7316' }}>
                                  Guardar
                                </button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {catEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                          Sin valores en esta categoría
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
