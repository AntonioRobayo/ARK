import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface CustomerRow {
  id: string
  first_name: string
  last_name: string | null
  tenant_id: string
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

export default async function PortalHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/portal/auth')
  }

  const adminClient = createAdminClient()

  const { data: customers } = await adminClient
    .from('customer')
    .select('id, first_name, last_name, tenant_id')
    .eq('email', user.email)
    .is('deleted_at', null)

  const customerList = (customers ?? []) as CustomerRow[]

  let vehicles: VehicleRow[] = []
  if (customerList.length > 0) {
    const ids = customerList.map((c) => c.id)
    const { data: vData } = await adminClient
      .from('vehicle')
      .select('id, plate, brand, model, year, color, vehicle_type, customer_id')
      .in('customer_id', ids)
      .order('created_at', { ascending: false })

    vehicles = (vData ?? []) as VehicleRow[]
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi portal</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      {/* Quick nav */}
      <div className="flex gap-3 mb-6">
        <a
          href="/portal"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-300 hover:shadow-sm transition-all"
        >
          🚗 <span>Mis vehículos</span>
        </a>
        <a
          href="/portal/appointments"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-300 hover:shadow-sm transition-all"
        >
          📅 <span>Mis citas</span>
        </a>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Mis vehículos</h2>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <p className="font-semibold text-gray-700 mb-1">
            No encontramos vehículos vinculados a tu correo
          </p>
          <p className="text-sm text-gray-500">
            Contacta al taller para vincular tu vehículo a esta cuenta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/portal/vehicles/${v.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all"
            >
              {/* Plate */}
              <div className="flex-shrink-0">
                <div
                  className="px-3 py-1.5 rounded-lg border-2 font-mono font-bold text-base tracking-widest text-gray-900 bg-gray-50 min-w-[90px] text-center"
                  style={{ borderColor: '#FF7316' }}
                >
                  {v.plate?.toUpperCase() ?? '—'}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {v.brand} {v.model}
                </p>
                <p className="text-sm text-gray-500">
                  {v.year ? `${v.year}` : ''}
                  {v.color ? ` · ${v.color}` : ''}
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="flex-shrink-0 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
