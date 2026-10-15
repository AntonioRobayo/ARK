import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface CustomerRow {
  id: string
  tenant_id: string
}

interface AppointmentRow {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  status: string
  notes: string | null
  vehicle: { plate: string | null; brand: string; model: string } | null
}

const STATUS_CLS: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-600',
  confirmed:   'bg-emerald-50 text-emerald-600',
  arrived:     'bg-amber-50 text-amber-600',
  in_progress: 'bg-purple-50 text-purple-600',
  completed:   'bg-gray-50 text-gray-500',
  cancelled:   'bg-red-50 text-red-400',
  no_show:     'bg-red-50 text-red-500',
}

const STATUS_LABEL: Record<string, string> = {
  scheduled:   'Agendada',
  confirmed:   'Confirmada',
  arrived:     'Llegó',
  in_progress: 'En proceso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
}

export default async function PortalAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>
}) {
  const { booked } = await searchParams

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

  let appointments: AppointmentRow[] = []
  if (customerIds.length > 0) {
    const { data } = await adminClient
      .from('appointment')
      .select('id, scheduled_at, duration_minutes, status, notes, vehicle:vehicle_id(plate, brand, model)')
      .in('customer_id', customerIds)
      .order('scheduled_at', { ascending: false })

    appointments = (data ?? []).map(row => ({
      ...row,
      vehicle: Array.isArray(row.vehicle) ? (row.vehicle[0] ?? null) : row.vehicle,
    })) as AppointmentRow[]
  }

  const now = new Date()
  const upcoming = appointments.filter((a) => new Date(a.scheduled_at) >= now)
  const past = appointments.filter((a) => new Date(a.scheduled_at) < now)

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  function AppointmentCard({ appt }: { appt: AppointmentRow }) {
    const { date, time } = formatDateTime(appt.scheduled_at)
    const statusCls = STATUS_CLS[appt.status] ?? 'bg-gray-50 text-gray-500'
    const statusLabel = STATUS_LABEL[appt.status] ?? appt.status

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-4">
        <div className="text-center min-w-[72px] shrink-0">
          <p className="text-sm font-bold text-gray-900">{date}</p>
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
        </div>
        <div className="flex-1 min-w-0">
          {appt.vehicle && (
            <p className="font-semibold text-gray-900 text-sm">
              <span className="font-mono">{appt.vehicle.plate?.toUpperCase() ?? '—'}</span>
              {' · '}{appt.vehicle.brand} {appt.vehicle.model}
            </p>
          )}
          {appt.notes && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{appt.notes}</p>
          )}
          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis citas</h1>
          <p className="text-sm text-gray-500 mt-1">
            <a href="/portal" className="hover:underline text-gray-400">← Inicio</a>
          </p>
        </div>
        <Link
          href="/portal/appointments/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}
        >
          Solicitar cita
        </Link>
      </div>

      {booked === '1' && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          ¡Cita solicitada! El taller te confirmará el horario.
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-semibold text-gray-700 mb-1">No tienes citas agendadas</p>
          <Link
            href="/portal/appointments/new"
            className="text-sm font-medium mt-3 inline-block px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}
          >
            Solicitar tu primera cita
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Próximas citas
              </h2>
              <div className="space-y-2">
                {upcoming.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Historial
              </h2>
              <div className="space-y-2">
                {past.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
