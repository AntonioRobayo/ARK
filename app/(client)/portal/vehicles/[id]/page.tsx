import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR, formatOtNumber } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

interface WorkOrderRow {
  id: string
  number: string
  status: WorkOrderStatus
  created_at: string
  closed_at: string | null
  technician: { first_name: string; last_name: string | null } | null
}

interface VehicleRow {
  id: string
  plate: string | null
  brand: string
  model: string
  year: number | null
  color: string | null
  vehicle_type: string
  customer_id: string | null
}

export default async function VehicleHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/portal/auth')

  const adminClient = createAdminClient()

  // Fetch vehicle
  const { data: vehicle } = await adminClient
    .from('vehicle')
    .select('id, plate, brand, model, year, color, vehicle_type, customer_id')
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  // Verify ownership: the vehicle's customer must share the logged-in email
  if (vehicle.customer_id) {
    const { data: customer } = await adminClient
      .from('customer')
      .select('email')
      .eq('id', vehicle.customer_id)
      .single()

    if (customer?.email?.toLowerCase() !== user.email.toLowerCase()) {
      notFound()
    }
  } else {
    notFound()
  }

  const vRow = vehicle as VehicleRow

  // Fetch work orders
  const { data: workOrders } = await adminClient
    .from('work_order')
    .select('id, number, status, created_at, closed_at, technician:technician_id(first_name, last_name)')
    .eq('vehicle_id', id)
    .order('created_at', { ascending: false })

  const orders = (workOrders ?? []) as unknown as WorkOrderRow[]

  return (
    <div>
      {/* Back */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis vehículos
      </Link>

      {/* Vehicle card */}
      <div className="rounded-2xl border border-gray-200 p-5 mb-8 bg-white">
        <div className="flex items-start gap-4">
          <div
            className="px-3 py-2 rounded-xl border-2 font-mono font-bold text-lg tracking-widest text-gray-900 bg-gray-50"
            style={{ borderColor: '#FF7316' }}
          >
            {vRow.plate?.toUpperCase() ?? '—'}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">
              {vRow.brand} {vRow.model}
            </p>
            <p className="text-sm text-gray-500">
              {vRow.year ? `${vRow.year}` : ''}
              {vRow.color ? ` · ${vRow.color}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Work orders */}
      <h2 className="font-bold text-gray-900 text-lg mb-4">Historial técnico</h2>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <p className="text-gray-500 text-sm">No hay órdenes de trabajo registradas aún.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-gray-200" />

          <div className="space-y-4">
            {orders.map((ot) => (
              <Link
                key={ot.id}
                href={`/portal/ot/${ot.id}`}
                className="flex gap-4 group"
              >
                {/* Timeline dot */}
                <div className="relative flex-shrink-0 mt-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 relative transition-transform group-hover:scale-110"
                    style={{ backgroundColor: '#FF7316' }}
                  >
                    OT
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-4 group-hover:border-orange-300 group-hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{formatOtNumber(ot.number)}</p>
                      {ot.technician && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Técnico: {ot.technician.first_name} {ot.technician.last_name ?? ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ot.created_at).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLOR[ot.status]}`}
                    >
                      {STATUS_LABEL[ot.status]}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
