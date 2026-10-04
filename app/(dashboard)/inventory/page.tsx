import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  part: 'Repuesto', consumable: 'Consumible', accessory: 'Accesorio', tool: 'Herramienta', other: 'Otro',
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const { q, type } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('inventory_item')
    .select('id, name, internal_code, barcode, type, sale_price, cost_price, unit_of_measure, is_active, min_stock, inventory_stock(quantity_on_hand)')
    .order('name', { ascending: true })

  if (q && q.length >= 2) {
    query = query.or(`name.ilike.%${q}%,internal_code.ilike.%${q}%,barcode.ilike.%${q}%`)
  }
  if (type) query = query.eq('type', type)

  const { data: items } = await query.limit(80)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items?.length ?? 0} ítems</p>
        </div>
        <Link href="/inventory/new" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nuevo ítem
        </Link>
      </div>

      <form method="get" className="flex gap-2 mb-5">
        <input name="q" type="search" defaultValue={q}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Buscar por nombre, código..." />
        <select name="type" defaultValue={type ?? ''}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors">
          Buscar
        </button>
      </form>

      {!items || items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium text-gray-500">{q ? `Sin resultados para "${q}"` : 'Sin ítems en inventario'}</p>
          <Link href="/inventory/new" className="text-slate-600 text-sm hover:underline mt-2 inline-block">Agregar primer ítem →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ítem</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Precio venta</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Costo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const stock = (item.inventory_stock ?? []).reduce((s: number, st: any) => s + (st.quantity_on_hand ?? 0), 0)
                const lowStock = item.min_stock != null && stock <= item.min_stock
                return (
                  <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`} className="font-medium text-gray-800 hover:text-slate-600">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.internal_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      ${(item.sale_price ?? 0).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      ${(item.cost_price ?? 0).toLocaleString('es-CO')}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${lowStock ? 'text-red-500' : 'text-gray-700'}`}>
                      {stock} {item.unit_of_measure ?? ''}
                      {lowStock && <span className="text-xs ml-1">⚠</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
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
