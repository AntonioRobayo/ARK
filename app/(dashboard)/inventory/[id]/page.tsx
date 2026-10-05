import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: stock }] = await Promise.all([
    supabase.from('inventory_item')
      .select('*')
      .eq('id', id).single(),
    supabase.from('inventory_stock')
      .select('id, quantity_on_hand, quantity_reserved, location:location_id(name)')
      .eq('item_id', id),
  ])

  if (!item) notFound()

  const t = await getTranslations('inventory')
  const TYPE_LABEL: Record<string, string> = {
    part: t('types.part'), consumable: t('types.consumable'), accessory: t('types.accessory'),
    tool: t('types.tool'), other: t('types.other'),
  }

  const totalStock = (stock ?? []).reduce((s: number, st: any) => s + (st.quantity_on_hand ?? 0), 0)
  const totalReserved = (stock ?? []).reduce((s: number, st: any) => s + (st.quantity_reserved ?? 0), 0)
  const available = totalStock - totalReserved
  const lowStock = item.min_stock != null && totalStock <= item.min_stock

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">{t('detail.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        {!item.is_active && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">{t('detail.inactive')}</span>}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.details')}</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <dt className="text-xs text-gray-400">{t('detail.internalCode')}</dt>
                <dd className="font-mono font-medium text-gray-700">{item.internal_code ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{t('detail.barcode')}</dt>
                <dd className="font-mono text-gray-700">{item.barcode ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{t('detail.salePrice')}</dt>
                <dd className="font-bold text-gray-900">${(item.sale_price ?? 0).toLocaleString('es-CO')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{t('detail.cost')}</dt>
                <dd className="text-gray-600">${(item.cost_price ?? 0).toLocaleString('es-CO')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{t('detail.unit')}</dt>
                <dd className="text-gray-700">{item.unit_of_measure ?? 'und'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{t('detail.minStock')}</dt>
                <dd className="text-gray-700">{item.min_stock ?? '—'}</dd>
              </div>
            </dl>
            {item.description && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{t('detail.description')}</p>
                <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
              </div>
            )}
          </div>

          {/* Stock por ubicación */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.stockByLocation')}</p>
            {(stock ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">{t('detail.noStock')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">{t('detail.locationTable.location')}</th>
                    <th className="text-right pb-2 font-medium">{t('detail.locationTable.available')}</th>
                    <th className="text-right pb-2 font-medium">{t('detail.locationTable.reserved')}</th>
                    <th className="text-right pb-2 font-medium">{t('detail.locationTable.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stock ?? []).map((st: any) => (
                    <tr key={st.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">{(st.location as any)?.name ?? t('detail.defaultLocation')}</td>
                      <td className="py-2 text-right font-medium text-gray-800">
                        {(st.quantity_on_hand ?? 0) - (st.quantity_reserved ?? 0)}
                      </td>
                      <td className="py-2 text-right text-amber-600">{st.quantity_reserved ?? 0}</td>
                      <td className="py-2 text-right text-gray-500">{st.quantity_on_hand ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="space-y-4">
          <div className={`bg-white border rounded-xl p-4 ${lowStock ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('detail.availableStock')}</p>
            <p className={`text-3xl font-bold mt-1 ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {available}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{item.unit_of_measure ?? 'und'}</p>
            {lowStock && <p className="text-xs text-red-500 mt-1">{t('detail.belowMin', { n: item.min_stock })}</p>}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('detail.reservedInOTs')}</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{totalReserved}</p>
          </div>
          <Link href="/inventory/new"
            className="block w-full text-center border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium py-2.5 rounded-lg transition-colors">
            {t('detail.newItem')}
          </Link>
        </div>
      </div>
    </div>
  )
}
