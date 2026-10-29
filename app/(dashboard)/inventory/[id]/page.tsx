import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { addCompatibility, removeCompatibility, updateItem } from './actions'
import { toggleItemActive, adjustStock } from '../actions'

const TYPE_LABEL: Record<string, string> = {
  part: 'Repuesto', consumable: 'Consumible', accessory: 'Accesorio',
  tool: 'Herramienta', product: 'Producto', other: 'Otro',
}

const MOVEMENT_LABEL: Record<string, string> = {
  purchase: 'Compra', sale: 'Venta', adjustment: 'Ajuste',
  consumption: 'Consumo', write_off: 'Baja', transfer: 'Traslado', return: 'Devolución',
}

type SearchParams = Promise<{ edit?: string }>

export default async function InventoryItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const { edit } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: profile } = await admin.from('user_profile').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id ?? ''

  const [{ data: item }, { data: stockRows }, { data: compatRows }, { data: movements }, { data: suppliers }] = await Promise.all([
    admin.from('inventory_item')
      .select('id, name, type, sku, internal_code, barcode, sale_price, cost_price, min_stock, description, is_active, unit_of_measure, created_at')
      .eq('id', id).is('deleted_at', null).single(),
    admin.from('inventory_stock')
      .select('id, quantity_on_hand, quantity_reserved, bin_location, inventory_location(name, branch:branch_id(name))')
      .eq('item_id', id),
    admin.from('inventory_item_compatibility')
      .select('id, brand, model, year_from, year_to, notes')
      .eq('item_id', id)
      .order('brand').order('model'),
    admin.from('inventory_movement')
      .select('id, movement_type, quantity, unit_cost, notes, created_at, performed_by')
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('supplier')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  if (!item) notFound()

  const totalOnHand  = (stockRows ?? []).reduce((s, r) => s + r.quantity_on_hand, 0)
  const totalReserved = (stockRows ?? []).reduce((s, r) => s + r.quantity_reserved, 0)
  const available    = totalOnHand - totalReserved

  const isEditing = edit === '1'

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">← Inventario</Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {TYPE_LABEL[item.type] ?? item.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              {item.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {item.sku && <p className="text-sm text-gray-400 font-mono mt-0.5">{item.sku}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <Link href={`/inventory/${id}`} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
              Cancelar
            </Link>
          ) : (
            <Link href={`/inventory/${id}?edit=1`} className="text-sm font-medium text-slate-700 hover:bg-slate-50 px-3 py-1.5 border border-gray-200 rounded-lg transition-colors">
              Editar
            </Link>
          )}
          <form action={toggleItemActive.bind(null, item.id, item.is_active)}>
            <button type="submit" className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              item.is_active
                ? 'border-red-200 text-red-500 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}>
              {item.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* General / Edit */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          {isEditing ? (
            <form action={updateItem} className="space-y-4">
              <input type="hidden" name="item_id" value={item.id} />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Editar información</h2>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                <input name="name" defaultValue={item.name} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">SKU</label>
                  <input name="sku" defaultValue={item.sku ?? ''} placeholder="FILT-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Código interno</label>
                  <input name="internal_code" defaultValue={item.internal_code ?? ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio venta</label>
                  <input name="sale_price" type="number" defaultValue={item.sale_price ?? ''} min="0" step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Costo</label>
                  <input name="cost_price" type="number" defaultValue={item.cost_price ?? ''} min="0" step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stock mínimo</label>
                  <input name="min_stock" type="number" defaultValue={item.min_stock ?? 0} min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Código de barras</label>
                  <input name="barcode" defaultValue={item.barcode ?? ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                <textarea name="description" rows={2} defaultValue={item.description ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
              </div>
              <SubmitButton pendingLabel="Guardando…" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                Guardar cambios
              </SubmitButton>
            </form>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Información</h2>
              <dl className="space-y-3 text-sm">
                {item.sku && (
                  <div className="flex gap-4">
                    <dt className="text-gray-400 w-32 shrink-0">SKU</dt>
                    <dd className="font-mono text-gray-700">{item.sku}</dd>
                  </div>
                )}
                {item.internal_code && (
                  <div className="flex gap-4">
                    <dt className="text-gray-400 w-32 shrink-0">Cód. interno</dt>
                    <dd className="text-gray-700">{item.internal_code}</dd>
                  </div>
                )}
                {item.barcode && (
                  <div className="flex gap-4">
                    <dt className="text-gray-400 w-32 shrink-0">Cód. barras</dt>
                    <dd className="font-mono text-gray-700">{item.barcode}</dd>
                  </div>
                )}
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-32 shrink-0">Unidad</dt>
                  <dd className="text-gray-700">{item.unit_of_measure}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-32 shrink-0">Precio venta</dt>
                  <dd className="font-semibold text-gray-900">
                    {item.sale_price != null ? `$${item.sale_price.toLocaleString('es-CO')}` : '—'}
                  </dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-32 shrink-0">Costo</dt>
                  <dd className="text-gray-700">
                    {item.cost_price != null ? `$${item.cost_price.toLocaleString('es-CO')}` : '—'}
                  </dd>
                </div>
                {item.description && (
                  <div className="flex gap-4">
                    <dt className="text-gray-400 w-32 shrink-0">Descripción</dt>
                    <dd className="text-gray-600">{item.description}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>

        {/* Stock */}
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Stock</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalOnHand}</p>
                <p className="text-xs text-gray-400 mt-0.5">En bodega</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{totalReserved}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reservado</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${available <= 0 ? 'text-red-500' : available <= item.min_stock ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {available}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Disponible</p>
              </div>
            </div>
            {available <= item.min_stock && item.is_active && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠ Stock bajo — mínimo: {item.min_stock} {item.unit_of_measure}
              </p>
            )}
          </div>

          {/* Per-location stock */}
          {(stockRows ?? []).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Por ubicación</h2>
              <div className="space-y-3">
                {stockRows!.map(row => {
                  const loc = Array.isArray(row.inventory_location) ? row.inventory_location[0] : row.inventory_location as any
                  const branch = Array.isArray(loc?.branch) ? loc?.branch[0] : loc?.branch
                  return (
                    <div key={row.id} className="text-sm">
                      <p className="font-medium text-gray-700">{loc?.name ?? 'Almacén'}</p>
                      {branch?.name && <p className="text-xs text-gray-400">{branch.name}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{row.quantity_on_hand} en bodega</span>
                        {row.quantity_reserved > 0 && <span>{row.quantity_reserved} reservado</span>}
                      </div>
                      {row.bin_location && (
                        <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1 font-mono">
                          📍 {row.bin_location}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compatibilidad vehicular */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Compatibilidad vehicular</h2>
            <p className="text-xs text-gray-400 mt-0.5">Vehículos con los que es compatible este repuesto</p>
          </div>
          <span className="text-xs text-gray-400">{(compatRows ?? []).length} vehículo{(compatRows ?? []).length !== 1 ? 's' : ''}</span>
        </div>

        {(compatRows ?? []).length > 0 && (
          <div className="divide-y divide-gray-50">
            {compatRows!.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm text-gray-800">{c.brand}</span>
                  {c.model && <span className="text-sm text-gray-600">{c.model}</span>}
                  {(c.year_from || c.year_to) && (
                    <span className="text-xs text-gray-400">
                      {c.year_from ?? '…'} – {c.year_to ?? 'hoy'}
                    </span>
                  )}
                  {c.notes && <span className="text-xs text-gray-400 italic">· {c.notes}</span>}
                </div>
                <form action={removeCompatibility.bind(null, c.id, item.id)}>
                  <button type="submit" className="text-red-300 hover:text-red-500 text-sm font-bold leading-none" title="Eliminar">×</button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <form action={addCompatibility} className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <input type="hidden" name="item_id" value={item.id} />
          <p className="text-xs text-gray-400 mb-3">Agregar compatibilidad</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Marca *</label>
              <input name="brand" required placeholder="Kawasaki"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Modelo</label>
              <input name="model" placeholder="Ninja 300"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Desde</label>
                <input name="year_from" type="number" placeholder="2018" min="1900" max="2100"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                <input name="year_to" type="number" placeholder="2024" min="1900" max="2100"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
              </div>
            </div>
            <SubmitButton pendingLabel="…" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              + Agregar
            </SubmitButton>
          </div>
          <div className="mt-2">
            <input name="notes" placeholder="Notas opcionales (ej. solo versión ABS)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
          </div>
        </form>
      </div>

      {/* Registrar movimiento */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Registrar movimiento</h2>
          <p className="text-xs text-gray-400 mt-0.5">Compra, ajuste, baja u otro movimiento de stock</p>
        </div>
        <form action={adjustStock} className="px-5 py-4">
          <input type="hidden" name="item_id" value={item.id} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo *</label>
              <select name="movement_type" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="purchase">Compra (entrada)</option>
                <option value="adjustment">Ajuste</option>
                <option value="return">Devolución</option>
                <option value="write_off">Baja / pérdida</option>
                <option value="consumption">Consumo interno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cantidad *</label>
              <input name="quantity" type="number" required min="0.01" step="0.01" placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Costo unitario <span className="text-gray-300">(compras)</span></label>
              <input name="unit_cost" type="number" min="0" step="0.01" placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <SubmitButton pendingLabel="Registrando…" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              Registrar
            </SubmitButton>
          </div>
          {(suppliers ?? []).length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Proveedor <span className="text-gray-300">(compras)</span></label>
                <select name="supplier_id"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="">Sin proveedor</option>
                  {suppliers!.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ref. compra <span className="text-gray-300">(factura / remisión)</span></label>
                <input name="purchase_reference" placeholder="Factura / remisión nro."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notas <span className="text-gray-300">(opcional)</span></label>
            <textarea name="notes" rows={2} placeholder="Proveedor, factura, motivo…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>
        </form>
      </div>

      {/* Historial de movimientos */}
      {(movements ?? []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Historial de movimientos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos {movements!.length} movimientos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Tipo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Cantidad</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Costo unit.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Notas</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements!.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.movement_type === 'purchase' ? 'bg-emerald-50 text-emerald-700' :
                        m.movement_type === 'sale' || m.movement_type === 'consumption' ? 'bg-orange-50 text-orange-600' :
                        m.movement_type === 'write_off' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${m.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                      {m.unit_cost != null ? `$${m.unit_cost.toLocaleString('es-CO')}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell text-xs">{m.notes ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs tabular-nums">
                      {new Date(m.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
