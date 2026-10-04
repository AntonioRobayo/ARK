import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  part: 'Repuesto', consumable: 'Consumible', accessory: 'Accesorio', tool: 'Herramienta', other: 'Otro',
}

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

  const totalStock = (stock ?? []).reduce((s: number, st: any) => s + (st.quantity_on_hand ?? 0), 0)
  const totalReserved = (stock ?? []).reduce((s: number, st: any) => s + (st.quantity_reserved ?? 0), 0)
  const available = totalStock - totalReserved
  const lowStock = item.min_stock != null && totalStock <= item.min_stock

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">← Inventario</Link>
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        {!item.is_active && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inactivo</span>}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Detalles</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Código interno</dt>
                <dd className="font-mono font-medium text-gray-700">{item.internal_code ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Código de barras</dt>
                <dd className="font-mono text-gray-700">{item.barcode ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Precio de venta</dt>
                <dd className="font-bold text-gray-900">${(item.sale_price ?? 0).toLocaleString('es-CO')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Costo</dt>
                <dd className="text-gray-600">${(item.cost_price ?? 0).toLocaleString('es-CO')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Unidad</dt>
                <dd className="text-gray-700">{item.unit_of_measure ?? 'und'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Stock mínimo</dt>
                <dd className="text-gray-700">{item.min_stock ?? '—'}</dd>
              </div>
            </dl>
            {item.description && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Descripción</p>
                <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
              </div>
            )}
          </div>

          {/* Stock por ubicación */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Stock por ubicación</p>
            {(stock ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Sin registros de stock</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Ubicación</th>
                    <th className="text-right pb-2 font-medium">Disponible</th>
                    <th className="text-right pb-2 font-medium">Reservado</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(stock ?? []).map((st: any) => (
                    <tr key={st.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">{(st.location as any)?.name ?? 'General'}</td>
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
            <p className="text-xs text-gray-400 uppercase tracking-wide">Stock disponible</p>
            <p className={`text-3xl font-bold mt-1 ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {available}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{item.unit_of_measure ?? 'und'}</p>
            {lowStock && <p className="text-xs text-red-500 mt-1">⚠ Stock bajo mínimo ({item.min_stock})</p>}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Reservado en OTs</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{totalReserved}</p>
          </div>
          <Link href="/inventory/new"
            className="block w-full text-center border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium py-2.5 rounded-lg transition-colors">
            + Nuevo ítem
          </Link>
        </div>
      </div>
    </div>
  )
}
