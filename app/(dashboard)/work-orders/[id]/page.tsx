import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR, STATUS_TRANSITIONS,
} from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'
import { changeStatus } from './actions'

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ot } = await supabase
    .from('work_order')
    .select(`
      *,
      customer:customer_id(id, first_name, last_name, phone, email),
      vehicle:vehicle_id(id, plate, brand, model, year, engine_cc, color, current_mileage),
      technician:technician_id(id, first_name, last_name),
      branch:branch_id(name)
    `)
    .eq('id', id)
    .single()

  if (!ot) notFound()

  const { data: statusLog } = await supabase
    .from('work_order_status_log')
    .select('id, from_status, to_status, reason, created_at, changed_by')
    .eq('work_order_id', id)
    .order('created_at', { ascending: false })

  const { data: tasks } = await supabase
    .from('work_order_task')
    .select('id, description, quantity, unit_price, total_price, task_type, is_completed')
    .eq('work_order_id', id)
    .order('created_at', { ascending: true })

  const transitions = STATUS_TRANSITIONS[ot.status as WorkOrderStatus] ?? []

  const totalServices = (tasks ?? []).reduce((sum: number, t: any) => sum + (t.total_price ?? 0), 0)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/work-orders" className="text-gray-400 hover:text-gray-600 text-sm">← OTs</Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">OT-{ot.number}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[ot.status as WorkOrderStatus]}`}>
                {STATUS_LABEL[ot.status as WorkOrderStatus]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[ot.priority ?? 'normal']}`}>
                {PRIORITY_LABEL[ot.priority ?? 'normal']}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {ot.branch?.name} · Creada {new Date(ot.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}
            </p>
          </div>
        </div>

        {/* Acciones de estado */}
        {transitions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {transitions.map(toStatus => (
              <form key={toStatus} action={changeStatus}>
                <input type="hidden" name="ot_id" value={ot.id} />
                <input type="hidden" name="to_status" value={toStatus} />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    toStatus === 'cancelled'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  → {STATUS_LABEL[toStatus]}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Columna izquierda (2/3) */}
        <div className="col-span-2 space-y-5">

          {/* Info vehículo + cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Vehículo</p>
              <p className="font-mono font-bold text-xl text-gray-900">{ot.vehicle?.plate ?? '—'}</p>
              <p className="font-medium text-gray-700 mt-0.5">{ot.vehicle?.brand} {ot.vehicle?.model} {ot.vehicle?.year}</p>
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                {ot.vehicle?.engine_cc && <p>Motor: {ot.vehicle.engine_cc}cc</p>}
                {ot.vehicle?.color && <p>Color: {ot.vehicle.color}</p>}
                {ot.reception_mileage && <p>Km recepción: {ot.reception_mileage.toLocaleString()}</p>}
              </div>
              <Link href={`/vehicles/${ot.vehicle?.id}`} className="text-xs text-slate-500 hover:underline mt-2 inline-block">
                Ver historial del vehículo →
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Cliente</p>
              <p className="font-semibold text-gray-900">{ot.customer?.first_name} {ot.customer?.last_name}</p>
              {ot.customer?.phone && <p className="text-sm text-gray-500 mt-0.5">{ot.customer.phone}</p>}
              {ot.customer?.email && <p className="text-xs text-gray-400">{ot.customer.email}</p>}
              <Link href={`/customers/${ot.customer?.id}`} className="text-xs text-slate-500 hover:underline mt-2 inline-block">
                Ver perfil del cliente →
              </Link>
            </div>
          </div>

          {/* Recepción */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Detalles de recepción</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Combustible</p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-4 rounded-sm ${i < (ot.fuel_level ?? 0) ? 'bg-green-400' : 'bg-gray-100'}`}
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">{ot.fuel_level ?? '—'}/8</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Batería</p>
                <p className="font-medium text-gray-700 mt-1">{ot.battery_level != null ? `${ot.battery_level}/10` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Técnico</p>
                <p className="font-medium text-gray-700 mt-1">
                  {ot.technician ? `${ot.technician.first_name} ${ot.technician.last_name ?? ''}` : 'Sin asignar'}
                </p>
              </div>
            </div>
            {ot.reception_notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Observaciones</p>
                <p className="text-sm text-gray-700 mt-0.5">{ot.reception_notes}</p>
              </div>
            )}
            {ot.estimated_delivery_at && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Entrega estimada</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  {new Date(ot.estimated_delivery_at).toLocaleString('es-CO', { day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            )}
          </div>

          {/* Servicios / tareas */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Servicios y repuestos</p>
              <button className="text-xs text-slate-600 hover:text-slate-800 font-medium">+ Agregar</button>
            </div>

            {!tasks || tasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aún no hay servicios registrados</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Descripción</th>
                      <th className="text-right pb-2 font-medium">Cant.</th>
                      <th className="text-right pb-2 font-medium">Precio</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{t.description}</td>
                        <td className="py-2 text-right text-gray-500">{t.quantity}</td>
                        <td className="py-2 text-right text-gray-500">${(t.unit_price ?? 0).toLocaleString()}</td>
                        <td className="py-2 text-right font-medium text-gray-800">${(t.total_price ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end pt-3 border-t border-gray-100 mt-1">
                  <span className="text-sm font-bold text-gray-900">Total: ${totalServices.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Columna derecha (1/3) — Timeline */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Historial de estados</p>

            {!statusLog || statusLog.length === 0 ? (
              <p className="text-xs text-gray-400">Sin historial</p>
            ) : (
              <div className="space-y-3">
                {statusLog.map((log: any, i: number) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${i === 0 ? 'bg-slate-700' : 'bg-gray-300'}`} />
                      {i < statusLog.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {STATUS_LABEL[log.to_status as WorkOrderStatus] ?? log.to_status}
                      </p>
                      {log.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{log.reason}</p>}
                      <p className="text-xs text-gray-300 mt-0.5">
                        {new Date(log.created_at).toLocaleString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
