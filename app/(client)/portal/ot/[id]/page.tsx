import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { WorkOrderStatus } from '@/types/database'

export const revalidate = 30

// 5 customer-friendly pipeline steps
const PIPELINE = [
  {
    key: 'recibido',
    label: 'Recibido',
    statuses: ['draft', 'received'] as WorkOrderStatus[],
  },
  {
    key: 'revision',
    label: 'En revisión',
    statuses: ['in_diagnosis', 'quotation_sent', 'awaiting_authorization', 'authorized'] as WorkOrderStatus[],
  },
  {
    key: 'reparacion',
    label: 'En reparación',
    statuses: ['in_execution', 'blocked_parts', 'blocked_technician', 'blocked_customer', 'quality_control'] as WorkOrderStatus[],
  },
  {
    key: 'listo',
    label: 'Listo',
    statuses: ['ready_for_delivery', 'delivered_with_balance'] as WorkOrderStatus[],
  },
  {
    key: 'entregado',
    label: 'Entregado',
    statuses: ['closed', 'warranty'] as WorkOrderStatus[],
  },
]

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  moderate: 'Moderado',
  minor:    'Menor',
}
const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-orange-50 text-orange-700 border-orange-200',
  minor:    'bg-yellow-50 text-yellow-700 border-yellow-200',
}
const RESPONSE_LABEL: Record<string, string> = {
  approve_quote: 'Solicitaste cotizar',
  reject:        'No cotizar',
  pending:       'Sin respuesta',
}

function getPipelineStep(status: WorkOrderStatus): number {
  return PIPELINE.findIndex(step => (step.statuses as string[]).includes(status))
}

export default async function OTTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/portal/auth')

  const adminClient = createAdminClient()

  const [{ data: ot }, { data: findings }, { data: photos }] = await Promise.all([
    adminClient
      .from('work_order')
      .select(`
        id, number, status, created_at, closed_at, vehicle_id, tenant_id,
        reception_notes, estimated_delivery_at,
        vehicle:vehicle_id(plate, brand, model, customer_id),
        technician:technician_id(first_name, last_name)
      `)
      .eq('id', id)
      .single(),
    adminClient
      .from('work_order_finding')
      .select('id, description, severity, customer_response, status')
      .eq('work_order_id', id)
      .in('status', ['notified', 'responded'])
      .order('created_at', { ascending: true }),
    adminClient
      .from('work_order_drive_attachment')
      .select('id, section, drive_file_id, drive_thumb_url, original_name')
      .eq('work_order_id', id)
      .in('section', ['recepcion', 'trabajo', 'entrega'])
      .order('created_at', { ascending: true }),
  ])

  if (!ot) notFound()

  // Verify ownership
  const vehicle = Array.isArray(ot.vehicle) ? ot.vehicle[0] : ot.vehicle as any
  const technician = Array.isArray(ot.technician) ? ot.technician[0] : ot.technician as any

  if (!vehicle?.customer_id) notFound()

  const [{ data: customer }, { data: tenant }] = await Promise.all([
    adminClient.from('customer').select('email').eq('id', vehicle.customer_id).single(),
    adminClient.from('tenant').select('name').eq('id', (ot as any).tenant_id).single(),
  ])

  if (customer?.email?.toLowerCase() !== user.email.toLowerCase()) notFound()

  const shopName = (tenant as any)?.name ?? null

  const status = ot.status as WorkOrderStatus
  const currentStep = getPipelineStep(status)
  const isCancelled = status === 'cancelled'
  const isReady = status === 'ready_for_delivery' || status === 'delivered_with_balance'
  const isClosed = status === 'closed' || status === 'warranty'

  const notifiedFindings = findings ?? []
  const visiblePhotos = photos ?? []

  return (
    <div>
      {/* Back */}
      <Link
        href={vehicle ? `/portal/vehicles/${ot.vehicle_id}` : '/portal'}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Historial del vehículo
      </Link>

      {/* Ready banner */}
      {isReady && (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-green-800">Tu vehículo está listo para retirar</p>
            <p className="text-sm text-green-700">
              {status === 'delivered_with_balance'
                ? 'El vehículo fue entregado. Hay un saldo pendiente de pago.'
                : 'Puedes pasar a retirar tu vehículo en el taller.'}
            </p>
          </div>
        </div>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 mb-5">
          <p className="font-bold text-red-700">Esta orden fue cancelada</p>
        </div>
      )}

      {/* OT header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Orden de trabajo</p>
            <p className="text-xl font-bold text-gray-900 font-mono mt-0.5">{ot.number}</p>
            {shopName && <p className="text-xs text-gray-400 mt-1">{shopName}</p>}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Vehículo</p>
            <p className="font-semibold text-gray-900">{vehicle?.plate?.toUpperCase() ?? '—'}</p>
            <p className="text-gray-500 text-xs">{vehicle?.brand} {vehicle?.model}</p>
          </div>
          {technician && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Técnico</p>
              <p className="font-semibold text-gray-900">{technician.first_name} {technician.last_name ?? ''}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Ingreso</p>
            <p className="text-gray-700">
              {new Date(ot.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {ot.estimated_delivery_at && !isClosed && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Entrega estimada</p>
              <p className="text-gray-700 font-medium">
                {new Date(ot.estimated_delivery_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
              </p>
            </div>
          )}
          {isClosed && ot.closed_at && (
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Entregado</p>
              <p className="text-gray-700">
                {new Date(ot.closed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5-step progress pipeline */}
      {!isCancelled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Estado del servicio</p>
          <div className="flex items-start gap-0">
            {PIPELINE.map((step, idx) => {
              const done   = idx < currentStep
              const active = idx === currentStep
              const isLast = idx === PIPELINE.length - 1
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        active
                          ? 'text-white shadow-md'
                          : done
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                      style={
                        active ? { backgroundColor: '#FF7316' } :
                        done   ? { backgroundColor: '#22c55e' } : {}
                      }
                    >
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[10px] text-center mt-1.5 leading-tight max-w-[56px] ${
                      active ? 'font-bold text-gray-800' : done ? 'text-gray-500' : 'text-gray-300'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mb-4 mx-1 ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Findings — only shown when notified to customer */}
      {notifiedFindings.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Hallazgos de la revisión</p>
          <div className="space-y-3">
            {notifiedFindings.map((f: any) => (
              <div key={f.id} className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded border ${SEVERITY_COLOR[f.severity] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {SEVERITY_LABEL[f.severity] ?? f.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{f.description}</p>
                  {f.customer_response && f.customer_response !== 'pending' && (
                    <p className={`text-xs mt-0.5 font-medium ${
                      f.customer_response === 'approve_quote' ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {RESPONSE_LABEL[f.customer_response] ?? f.customer_response}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {visiblePhotos.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Fotos del servicio</p>
          <div className="grid grid-cols-3 gap-2">
            {visiblePhotos.map((p: any) => (
              <a
                key={p.id}
                href={`https://drive.google.com/file/d/${p.drive_file_id}/view`}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={p.drive_thumb_url ?? `https://drive.google.com/thumbnail?id=${p.drive_file_id}&sz=w200`}
                  alt={p.original_name}
                  className="w-full aspect-square object-cover rounded-xl border border-gray-100"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reception notes */}
      {ot.reception_notes && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Observaciones al ingreso</p>
          <p className="text-sm text-gray-600 leading-relaxed">{ot.reception_notes}</p>
        </div>
      )}
    </div>
  )
}
