import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR, formatOtNumber } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export const revalidate = 30

// Ordered pipeline of statuses (visible to customer)
const STATUS_PIPELINE: WorkOrderStatus[] = [
  'received',
  'in_diagnosis',
  'quotation_sent',
  'awaiting_authorization',
  'authorized',
  'in_execution',
  'quality_control',
  'ready_for_delivery',
  'closed',
]

interface OTRow {
  id: string
  number: string
  status: WorkOrderStatus
  created_at: string
  closed_at: string | null
  vehicle_id: string
  vehicle: {
    plate: string | null
    brand: string
    model: string
    customer_id: string | null
  } | null
  technician: { first_name: string; last_name: string | null } | null
}

function getPipelineIndex(status: WorkOrderStatus): number {
  // Special states that map to a specific stage
  const mapped: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
    draft:                  'received',
    blocked_parts:          'in_execution',
    blocked_technician:     'in_execution',
    blocked_customer:       'in_execution',
    delivered_with_balance: 'ready_for_delivery',
    warranty:               'closed',
    cancelled:              'closed',
  }
  const effective = mapped[status] ?? status
  return STATUS_PIPELINE.indexOf(effective)
}

export default async function OTTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/portal/auth')

  const adminClient = createAdminClient()

  const { data: ot } = await adminClient
    .from('work_order')
    .select(`
      id, number, status, created_at, closed_at, vehicle_id,
      vehicle:vehicle_id(plate, brand, model, customer_id),
      technician:technician_id(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!ot) notFound()

  const otRow = ot as unknown as OTRow

  // Verify ownership
  const customerId = otRow.vehicle?.customer_id
  if (!customerId) notFound()

  const { data: customer } = await adminClient
    .from('customer')
    .select('email')
    .eq('id', customerId)
    .single()

  if (customer?.email?.toLowerCase() !== user.email.toLowerCase()) {
    notFound()
  }

  const isReady =
    otRow.status === 'ready_for_delivery' || otRow.status === 'delivered_with_balance'
  const isClosed = otRow.status === 'closed'
  const isCancelled = otRow.status === 'cancelled'

  const currentIdx = getPipelineIndex(otRow.status)

  return (
    <div>
      {/* Back */}
      <Link
        href={otRow.vehicle_id ? `/portal/vehicles/${otRow.vehicle_id}` : '/portal'}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Historial del vehículo
      </Link>

      {/* Ready banner */}
      {isReady && (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-green-800">Tu vehículo está listo</p>
            <p className="text-sm text-green-700">
              {otRow.status === 'delivered_with_balance'
                ? 'El vehículo fue entregado. Hay un saldo pendiente de pago.'
                : 'Puedes pasar a retirar tu vehículo.'}
            </p>
          </div>
        </div>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 mb-6">
          <p className="font-bold text-red-700">Esta orden fue cancelada</p>
        </div>
      )}

      {/* OT header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 font-medium">Orden de Trabajo</p>
            <p className="text-2xl font-bold text-gray-900">{formatOtNumber(otRow.number)}</p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLOR[otRow.status]}`}
          >
            {STATUS_LABEL[otRow.status]}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
          {otRow.vehicle && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Vehículo</p>
              <p className="font-semibold text-gray-900">
                {otRow.vehicle.plate?.toUpperCase() ?? '—'}
              </p>
              <p className="text-gray-500 text-xs">
                {otRow.vehicle.brand} {otRow.vehicle.model}
              </p>
            </div>
          )}
          {otRow.technician && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Técnico</p>
              <p className="font-semibold text-gray-900">
                {otRow.technician.first_name} {otRow.technician.last_name ?? ''}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Ingreso</p>
            <p className="text-gray-700">
              {new Date(otRow.created_at).toLocaleDateString('es', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          {(isClosed || otRow.closed_at) && otRow.closed_at && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Cierre</p>
              <p className="text-gray-700">
                {new Date(otRow.closed_at).toLocaleDateString('es', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress pipeline */}
      {!isCancelled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Progreso</p>
          <div className="flex items-center overflow-x-auto pb-2 gap-0">
            {STATUS_PIPELINE.map((step, idx) => {
              const done = idx < currentIdx
              const active = idx === currentIdx
              const isLast = idx === STATUS_PIPELINE.length - 1

              return (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        active
                          ? 'text-white shadow-lg'
                          : done
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      style={
                        active
                          ? { backgroundColor: '#FF7316' }
                          : done
                          ? { backgroundColor: '#22c55e' }
                          : {}
                      }
                    >
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[9px] text-center max-w-[56px] leading-tight ${active ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
                      {STATUS_LABEL[step]}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`w-6 h-0.5 flex-shrink-0 mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
