import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'
import { getTranslations } from 'next-intl/server'

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: vehicle }, { data: orders }] = await Promise.all([
    supabase.from('vehicle')
      .select(`*, customer:customer_id(id, first_name, last_name, phone)`)
      .eq('id', id)
      .single(),
    supabase.from('work_order')
      .select('id, number, status, priority, created_at, reception_mileage, technician:technician_id(first_name, last_name)')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!vehicle) notFound()

  const t = await getTranslations('vehicles')

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vehicles" className="text-gray-400 hover:text-gray-600 text-sm">{t('detail.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900 font-mono">{vehicle.plate ?? t('detail.noPlate')}</h1>
        <span className="text-gray-400 text-lg font-normal">{vehicle.brand} {vehicle.model} {vehicle.year}</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.vehicleSection')}</p>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-gray-400">{t('detail.type')}</dt><dd className="font-medium text-gray-700 capitalize">{vehicle.vehicle_type}</dd></div>
              <div><dt className="text-xs text-gray-400">{t('detail.brandModel')}</dt><dd className="font-medium text-gray-700">{vehicle.brand} {vehicle.model}</dd></div>
              <div><dt className="text-xs text-gray-400">{t('detail.year')}</dt><dd className="font-medium text-gray-700">{vehicle.year ?? '—'}</dd></div>
              {vehicle.color && <div><dt className="text-xs text-gray-400">{t('detail.color')}</dt><dd className="font-medium text-gray-700">{vehicle.color}</dd></div>}
              {vehicle.engine_cc && <div><dt className="text-xs text-gray-400">{t('detail.engine')}</dt><dd className="font-medium text-gray-700">{vehicle.engine_cc} cc</dd></div>}
              {vehicle.current_mileage && <div><dt className="text-xs text-gray-400">{t('detail.mileage')}</dt><dd className="font-medium text-gray-700">{vehicle.current_mileage.toLocaleString()} km</dd></div>}
            </dl>
            {vehicle.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{t('detail.notes')}</p>
                <p className="text-xs text-gray-600 mt-1">{vehicle.notes}</p>
              </div>
            )}
          </div>

          {vehicle.customer && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.owner')}</p>
              <Link href={`/customers/${vehicle.customer.id}`} className="font-semibold text-gray-900 hover:text-slate-600 block">
                {vehicle.customer.first_name} {vehicle.customer.last_name}
              </Link>
              {vehicle.customer.phone && <p className="text-sm text-gray-500 mt-0.5">{vehicle.customer.phone}</p>}
            </div>
          )}

          <Link
            href={`/work-orders/new?customer_id=${vehicle.customer_id}&vehicle_id=${id}`}
            className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {t('detail.newOT')}
          </Link>
        </div>

        {/* Historial de OTs */}
        <div className="col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {t('detail.historyTitle', { n: orders?.length ?? 0 })}
            </p>
            {!orders || orders.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">{t('detail.noHistory')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">{t('detail.table.ot')}</th>
                    <th className="text-left pb-2 font-medium">{t('detail.table.status')}</th>
                    <th className="text-left pb-2 font-medium">{t('detail.table.technician')}</th>
                    <th className="text-left pb-2 font-medium">{t('detail.table.kmEntry')}</th>
                    <th className="text-left pb-2 font-medium">{t('detail.table.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
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
                      <td className="py-2 text-gray-500 text-xs">
                        {o.technician ? `${o.technician.first_name} ${o.technician.last_name ?? ''}` : '—'}
                      </td>
                      <td className="py-2 text-gray-400 text-xs">
                        {o.reception_mileage ? `${o.reception_mileage.toLocaleString()} km` : '—'}
                      </td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(o.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
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
