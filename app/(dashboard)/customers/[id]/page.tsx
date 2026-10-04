import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: customer }, { data: vehicles }, { data: orders }] = await Promise.all([
    supabase.from('customer').select('*').eq('id', id).single(),
    supabase.from('vehicle').select('id, plate, brand, model, year, vehicle_type, current_mileage').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('work_order').select('id, number, status, priority, created_at, vehicle:vehicle_id(plate, brand, model)').eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!customer) notFound()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600 text-sm">← Clientes</Link>
        <h1 className="text-2xl font-bold text-gray-900">{customer.first_name} {customer.last_name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Información</p>
            <dl className="space-y-2 text-sm">
              {customer.id_number && (
                <div><dt className="text-gray-400 text-xs">{customer.id_type}</dt><dd className="font-medium text-gray-800">{customer.id_number}</dd></div>
              )}
              {customer.phone && (
                <div><dt className="text-gray-400 text-xs">Teléfono</dt><dd className="font-medium text-gray-800">{customer.phone}</dd></div>
              )}
              {customer.email && (
                <div><dt className="text-gray-400 text-xs">Email</dt><dd className="text-gray-600 text-xs">{customer.email}</dd></div>
              )}
              {customer.address && (
                <div><dt className="text-gray-400 text-xs">Dirección</dt><dd className="text-gray-600 text-xs">{customer.address}</dd></div>
              )}
              {customer.is_credit_enabled && (
                <div><dt className="text-gray-400 text-xs">Crédito</dt><dd><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Habilitado</span></dd></div>
              )}
            </dl>
            {customer.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Notas</p>
                <p className="text-xs text-gray-600 mt-1">{customer.notes}</p>
              </div>
            )}
          </div>

          <Link href={`/work-orders/new?q=${encodeURIComponent(customer.first_name)}`}
            className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            + Nueva OT para este cliente
          </Link>
        </div>

        {/* Vehículos + historial */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Vehículos</p>
              <Link href={`/vehicles/new?customer_id=${id}`} className="text-xs text-slate-600 hover:text-slate-800 font-medium">+ Registrar</Link>
            </div>
            {!vehicles || vehicles.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Sin vehículos registrados</p>
            ) : (
              <div className="space-y-2">
                {vehicles.map((v: any) => (
                  <Link key={v.id} href={`/vehicles/${v.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <span className="font-mono font-bold text-gray-900">{v.plate ?? '—'}</span>
                      <span className="text-gray-400 text-sm ml-2">{v.brand} {v.model} {v.year}</span>
                    </div>
                    <span className="text-xs text-gray-400">{v.current_mileage ? `${v.current_mileage.toLocaleString()} km` : ''}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Últimas órdenes de trabajo</p>
            {!orders || orders.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Sin órdenes de trabajo</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-50">
                      <td className="py-2">
                        <Link href={`/work-orders/${o.id}`} className="font-mono font-semibold text-slate-800 hover:text-slate-600">
                          OT-{o.number}
                        </Link>
                      </td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status as WorkOrderStatus]}`}>
                          {STATUS_LABEL[o.status as WorkOrderStatus]}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400 text-xs">{o.vehicle?.plate} — {o.vehicle?.brand} {o.vehicle?.model}</td>
                      <td className="py-2 text-gray-400 text-xs text-right">
                        {new Date(o.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
