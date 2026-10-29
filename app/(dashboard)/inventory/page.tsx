import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

const CURRENCY_SYMBOL: Record<string, string> = { COP: '$', USD: '$', EUR: '€', BRL: 'R$' }

function formatPrice(amount: number | null, currency = 'COP') {
  if (amount === null) return '—'
  const sym = CURRENCY_SYMBOL[currency] ?? '$'
  return `${sym}${amount.toLocaleString('es-CO')}`
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; imported?: string }>
}) {
  const { q, type, imported } = await searchParams
  const t = await getTranslations('inventory')
  const supabase = await createClient()

  // Get tenant currency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('currency_code')
    .eq('id', profile!.tenant_id)
    .single()
  const currency = tenant?.currency_code ?? 'COP'

  // Build items query
  let query = supabase
    .from('inventory_item')
    .select('id, name, type, internal_code, sale_price, cost_price, min_stock, is_active, unit_of_measure')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (q) query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('type', type)

  const { data: items } = await query

  // Get stock totals
  const { data: stockRows } = await supabase
    .from('inventory_stock')
    .select('item_id, quantity_on_hand, quantity_reserved')

  const stockMap: Record<string, { on_hand: number; reserved: number }> = {}
  for (const row of stockRows ?? []) {
    if (!stockMap[row.item_id]) stockMap[row.item_id] = { on_hand: 0, reserved: 0 }
    stockMap[row.item_id].on_hand += row.quantity_on_hand
    stockMap[row.item_id].reserved += row.quantity_reserved
  }

  const TYPES = ['part', 'product', 'supply', 'tool']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          {items && <p className="text-sm text-gray-400 mt-0.5">{t('count', { n: items.length })}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/import"
            className="border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Importar CSV
          </Link>
          <Link
            href="/inventory/new"
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {t('newBtn')}
          </Link>
        </div>
      </div>

      {/* Import success banner */}
      {imported && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          ✓ Se importaron {imported} ítems correctamente.
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('searchPlaceholder')}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
        >
          <option value="">{t('allTypes')}</option>
          {TYPES.map(tp => (
            <option key={tp} value={tp}>{t(`types.${tp}`)}</option>
          ))}
        </select>
        <button type="submit" className="border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {t('search')}
        </button>
      </form>

      {/* Table */}
      {!items?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium">{q ? t('noResults', { q }) : t('empty')}</p>
          {!q && (
            <Link href="/inventory/new" className="inline-block mt-3 text-sm text-slate-600 hover:underline">
              {t('createFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.item')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">{t('table.code')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">{t('table.type')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('table.salePrice')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 hidden md:table-cell">{t('table.cost')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t('table.stock')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">{t('table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const stock = stockMap[item.id]
                const available = (stock?.on_hand ?? 0) - (stock?.reserved ?? 0)
                const isBelowMin = available < item.min_stock
                return (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`} className="font-medium text-gray-900 hover:text-slate-700">
                        {item.name}
                      </Link>
                      <p className="text-xs text-gray-400 md:hidden">{item.internal_code ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell font-mono text-xs">
                      {item.internal_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {t(`types.${item.type}`)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatPrice(item.sale_price, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">
                      {formatPrice(item.cost_price, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-full ${
                        !item.is_active ? 'text-gray-400 bg-gray-50' :
                        isBelowMin ? 'text-red-600 bg-red-50' :
                        'text-emerald-600 bg-emerald-50'
                      }`}>
                        {isBelowMin && item.is_active && '⚠ '}
                        {available} {item.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'
                      }`}>
                        {item.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
