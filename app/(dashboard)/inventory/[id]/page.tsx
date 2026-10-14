import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InventoryDetailClient } from './InventoryDetailClient'

const CURRENCY_SYMBOL: Record<string, string> = { COP: '$', USD: '$', EUR: '€', BRL: 'R$' }

function formatPrice(amount: number | null, currency = 'COP') {
  if (amount === null) return '—'
  const sym = CURRENCY_SYMBOL[currency] ?? '$'
  return `${sym}${amount.toLocaleString('es-CO')}`
}

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('inventory')
  const supabase = await createClient()

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

  const { data: item } = await supabase
    .from('inventory_item')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!item) notFound()

  const [{ data: stockRows }, { data: movements }] = await Promise.all([
    supabase
      .from('inventory_stock')
      .select('id, quantity_on_hand, quantity_reserved, location_id, inventory_location(name)')
      .eq('item_id', id),
    supabase
      .from('inventory_movement')
      .select('id, movement_type, quantity, unit_cost, notes, created_at, performed_by, user_profile(first_name, last_name)')
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const totalOnHand = (stockRows ?? []).reduce((s, r) => s + (r.quantity_on_hand ?? 0), 0)
  const totalReserved = (stockRows ?? []).reduce((s, r) => s + (r.quantity_reserved ?? 0), 0)
  const available = totalOnHand - totalReserved
  const isBelowMin = available < item.min_stock

  const MOVEMENT_LABELS: Record<string, string> = {
    purchase: 'Compra',
    return_to_stock: 'Devolución a stock',
    consumption: 'Consumo',
    transfer_in: 'Transferencia entrada',
    transfer_out: 'Transferencia salida',
    adjustment: 'Ajuste',
    write_off: 'Baja',
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">{t('detail.back')}</Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            {!item.is_active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                {t('detail.inactive')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{t(`types.${item.type}`)}</p>
        </div>
        <Link
          href="/inventory/new"
          className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg"
        >
          {t('detail.newItem')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className={`rounded-xl p-4 border ${isBelowMin && item.is_active ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('detail.availableStock')}</p>
          <p className={`text-3xl font-bold ${isBelowMin && item.is_active ? 'text-red-600' : 'text-gray-900'}`}>
            {available}
            <span className="text-sm font-normal text-gray-400 ml-1">{item.unit_of_measure}</span>
          </p>
          {isBelowMin && item.is_active && (
            <p className="text-xs text-red-500 mt-1">{t('detail.belowMin', { n: item.min_stock })}</p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('detail.reservedInOTs')}</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalReserved}
            <span className="text-sm font-normal text-gray-400 ml-1">{item.unit_of_measure}</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('new.salePrice')}</p>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(item.sale_price, currency)}</p>
          {item.cost_price && (
            <p className="text-xs text-gray-400 mt-1">{t('new.cost')}: {formatPrice(item.cost_price, currency)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Item details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('detail.details')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">{t('detail.internalCode')}</dt>
              <dd className="font-mono text-gray-700">{item.internal_code ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">{t('detail.barcode')}</dt>
              <dd className="font-mono text-gray-700">{item.barcode ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">{t('detail.unit')}</dt>
              <dd className="text-gray-700">{item.unit_of_measure}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">{t('detail.minStock')}</dt>
              <dd className="text-gray-700">{item.min_stock}</dd>
            </div>
            {item.description && (
              <div className="pt-2 border-t border-gray-50">
                <dt className="text-gray-400 mb-1">{t('detail.description')}</dt>
                <dd className="text-gray-600">{item.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Stock by location */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('detail.stockByLocation')}</h2>
          {!stockRows?.length ? (
            <p className="text-sm text-gray-300">{t('detail.noStock')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left pb-2 text-xs text-gray-400 font-medium">{t('detail.locationTable.location')}</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">{t('detail.locationTable.available')}</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">{t('detail.locationTable.reserved')}</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map(row => {
                  const loc = Array.isArray(row.inventory_location) ? row.inventory_location[0] : row.inventory_location
                  return (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-1.5 text-gray-700">{(loc as { name: string } | null)?.name ?? t('detail.defaultLocation')}</td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {row.quantity_on_hand - row.quantity_reserved}
                      </td>
                      <td className="py-1.5 text-right text-gray-400">{row.quantity_reserved}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock adjustment + movement log */}
      <InventoryDetailClient
        itemId={id}
        itemName={item.name}
        unit={item.unit_of_measure}
        isActive={item.is_active}
        movements={(movements ?? []).map(m => {
          const prof = Array.isArray(m.user_profile) ? m.user_profile[0] : m.user_profile
          const p = prof as { first_name: string; last_name: string | null } | null
          return {
            id: m.id,
            movement_type: m.movement_type,
            quantity: m.quantity,
            unit_cost: m.unit_cost,
            notes: m.notes,
            created_at: m.created_at,
            performer: p ? `${p.first_name}${p.last_name ? ` ${p.last_name}` : ''}` : null,
          }
        })}
        movementLabels={MOVEMENT_LABELS}
      />
    </div>
  )
}
