import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { bookAppointment } from './actions'

interface CustomerRow {
  id: string
  tenant_id: string
}

interface VehicleRow {
  id: string
  plate: string | null
  brand: string
  model: string
}

export default async function PortalNewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/portal/auth')
  }

  const adminClient = createAdminClient()

  const { data: customers } = await adminClient
    .from('customer')
    .select('id, tenant_id')
    .eq('email', user.email)
    .is('deleted_at', null)

  const customerList = (customers ?? []) as CustomerRow[]
  const customerIds = customerList.map((c) => c.id)

  let vehicles: VehicleRow[] = []
  if (customerIds.length > 0) {
    const { data: vData } = await adminClient
      .from('vehicle')
      .select('id, plate, brand, model')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })

    vehicles = (vData ?? []) as VehicleRow[]
  }

  // Default: tomorrow at 9am
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  const defaultDate = tomorrow.toISOString().slice(0, 16)

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/portal/appointments" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Mis citas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Solicitar cita</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {customerIds.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="font-semibold text-gray-700 mb-1">
            No encontramos tu cuenta vinculada
          </p>
          <p className="text-sm text-gray-500">
            Contacta al taller para vincular tu correo a tu ficha de cliente.
          </p>
        </div>
      ) : (
        <form
          action={bookAppointment}
          className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5"
        >
          {/* Vehicle selector */}
          <div>
            <label className={labelCls}>Vehículo</label>
            {vehicles.length > 0 ? (
              <select name="vehicle_id" required className={inputCls}>
                <option value="">Seleccionar vehículo…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate?.toUpperCase() ?? '—'} — {v.brand} {v.model}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="vehicle_id" value="" />
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  Sin vehículos registrados. Contacta al taller para agregar uno.
                </p>
              </>
            )}
          </div>

          {/* Preferred date/time */}
          <div>
            <label className={labelCls}>Fecha y hora preferida</label>
            <input
              name="scheduled_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className={inputCls}
            />
          </div>

          {/* Service / reason */}
          <div>
            <label className={labelCls}>Servicio / motivo</label>
            <input
              name="service_reason"
              type="text"
              required
              placeholder="Ej. cambio de aceite, revisión de frenos…"
              className={inputCls}
            />
          </div>

          {/* Additional notes */}
          <div>
            <label className={labelCls}>
              Notas adicionales{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Cualquier detalle adicional que el taller deba saber…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            type="submit"
            className="w-full font-medium py-3 rounded-xl text-sm text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}
          >
            Solicitar cita
          </button>
        </form>
      )}
    </div>
  )
}
