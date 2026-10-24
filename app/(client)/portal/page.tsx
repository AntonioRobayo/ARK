import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { WorkOrderStatus } from '@/types/database'

const ACTIVE_STATUSES: WorkOrderStatus[] = [
  'received', 'in_diagnosis', 'quotation_sent', 'awaiting_authorization',
  'authorized', 'in_execution', 'blocked_parts', 'blocked_technician',
  'blocked_customer', 'quality_control', 'ready_for_delivery', 'delivered_with_balance',
]

const CUSTOMER_STAGE: Record<string, { label: string; color: string }> = {
  received:               { label: 'Recibido en el taller',       color: 'bg-blue-50 text-blue-700' },
  in_diagnosis:           { label: 'En revisión',                  color: 'bg-purple-50 text-purple-700' },
  quotation_sent:         { label: 'Revisando cotización',         color: 'bg-yellow-50 text-yellow-700' },
  awaiting_authorization: { label: 'Pendiente de aprobación',      color: 'bg-orange-50 text-orange-700' },
  authorized:             { label: 'Aprobado',                     color: 'bg-emerald-50 text-emerald-700' },
  in_execution:           { label: 'En reparación',                color: 'bg-blue-50 text-blue-800' },
  blocked_parts:          { label: 'En reparación',                color: 'bg-blue-50 text-blue-800' },
  blocked_technician:     { label: 'En reparación',                color: 'bg-blue-50 text-blue-800' },
  blocked_customer:       { label: 'En reparación',                color: 'bg-blue-50 text-blue-800' },
  quality_control:        { label: 'Revisión final',               color: 'bg-teal-50 text-teal-700' },
  ready_for_delivery:     { label: '¡Listo para retirar!',         color: 'bg-green-50 text-green-700' },
  delivered_with_balance: { label: 'Entregado',                    color: 'bg-gray-100 text-gray-700' },
}

export default async function PortalHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect('/portal/auth')

  const adminClient = createAdminClient()

  const { data: customers } = await adminClient
    .from('customer')
    .select('id, first_name, last_name, tenant_id')
    .eq('email', user.email)
    .is('deleted_at', null)

  const customerList = customers ?? []
  const customerIds = customerList.map((c: any) => c.id)
  const tenantIds = [...new Set(customerList.map((c: any) => c.tenant_id as string))]

  let vehicles: any[] = []
  let activeOTs: any[] = []
  let tenantMap: Record<string, string> = {}

  if (customerIds.length > 0) {
    const [{ data: vData }, { data: otData }, { data: tData }] = await Promise.all([
      adminClient
        .from('vehicle')
        .select('id, plate, brand, model, year, color, vehicle_type, customer_id')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false }),
      adminClient
        .from('work_order')
        .select('id, number, status, vehicle_id, tenant_id, vehicle:vehicle_id(plate, brand, model)')
        .in('customer_id', customerIds)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false }),
      adminClient
        .from('tenant')
        .select('id, name')
        .in('id', tenantIds),
    ])
    vehicles = vData ?? []
    activeOTs = otData ?? []
    tenantMap = Object.fromEntries((tData ?? []).map((t: any) => [t.id, t.name]))
  }

  const customerTenantMap = Object.fromEntries(customerList.map((c: any) => [c.id, c.tenant_id]))
  const multiTenant = tenantIds.length > 1

  const firstName = (customerList[0] as any)?.first_name

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName ? `Hola, ${firstName}` : 'Mi portal'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      {/* Active OTs — most prominent section */}
      {activeOTs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">En el taller ahora</h2>
          <div className="space-y-3">
            {activeOTs.map((ot: any) => {
              const vehicle = Array.isArray(ot.vehicle) ? ot.vehicle[0] : ot.vehicle
              const stage = CUSTOMER_STAGE[ot.status]
              const isReady = ot.status === 'ready_for_delivery'
              const shopName = tenantMap[(ot as any).tenant_id]
              return (
                <Link
                  key={ot.id}
                  href={`/portal/ot/${ot.id}`}
                  className={`block rounded-2xl border p-4 transition-all hover:shadow-sm ${
                    isReady
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isReady && <span className="text-xl">✅</span>}
                      <div>
                        <p className="font-bold text-gray-900">
                          {vehicle?.plate?.toUpperCase() ?? '—'}
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            {vehicle?.brand} {vehicle?.model}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ot.number}
                          {shopName && <span className="ml-1.5">· {shopName}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {stage && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stage.color}`}>
                          {stage.label}
                        </span>
                      )}
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="flex gap-3 mb-6">
        <a href="/portal" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-300 hover:shadow-sm transition-all">
          🚗 <span>Mis vehículos</span>
        </a>
        <a href="/portal/appointments" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-300 hover:shadow-sm transition-all">
          📅 <span>Mis citas</span>
        </a>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">Mis vehículos</h2>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <p className="font-semibold text-gray-700 mb-1">No encontramos vehículos vinculados a tu correo</p>
          <p className="text-sm text-gray-500">Contacta al taller para vincular tu vehículo a esta cuenta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v: any) => {
            const vTenantId = customerTenantMap[v.customer_id]
            const vShopName = multiTenant ? tenantMap[vTenantId] : null
            return (
            <Link
              key={v.id}
              href={`/portal/vehicles/${v.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="flex-shrink-0">
                <div className="px-3 py-1.5 rounded-lg border-2 font-mono font-bold text-base tracking-widest text-gray-900 bg-gray-50 min-w-[90px] text-center" style={{ borderColor: '#FF7316' }}>
                  {v.plate?.toUpperCase() ?? '—'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{v.brand} {v.model}</p>
                <p className="text-sm text-gray-500">
                  {v.year ? `${v.year}` : ''}{v.color ? ` · ${v.color}` : ''}
                  {vShopName && <span className="block text-xs text-gray-400 mt-0.5">{vShopName}</span>}
                </p>
              </div>
              <svg className="flex-shrink-0 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
