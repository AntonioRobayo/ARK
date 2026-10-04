import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { updateAppointmentStatus, convertToWorkOrder } from './actions'

const APPT_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Agendada',   cls: 'bg-blue-50 text-blue-600' },
  confirmed:   { label: 'Confirmada', cls: 'bg-emerald-50 text-emerald-600' },
  arrived:     { label: 'Llegó',      cls: 'bg-amber-50 text-amber-600' },
  in_progress: { label: 'En proceso', cls: 'bg-purple-50 text-purple-600' },
  completed:   { label: 'Completada', cls: 'bg-gray-50 text-gray-500' },
  cancelled:   { label: 'Cancelada',  cls: 'bg-red-50 text-red-400' },
  no_show:     { label: 'No asistió', cls: 'bg-red-50 text-red-500' },
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'upcoming' } = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('appointment')
    .select(`
      id, scheduled_at, duration_minutes, status, notes, source,
      customer:customer_id(id, first_name, last_name, phone),
      vehicle:vehicle_id(id, plate, brand, model),
      work_order:ot_id(number)
    `)
    .order('scheduled_at', { ascending: tab !== 'past' })

  if (tab === 'upcoming') {
    query = query.gte('scheduled_at', today).in('status', ['scheduled', 'confirmed'])
  } else if (tab === 'today') {
    query = query.gte('scheduled_at', today + 'T00:00:00').lte('scheduled_at', today + 'T23:59:59')
  } else if (tab === 'past') {
    query = query.lt('scheduled_at', today)
  }

  const { data: appointments } = await query.limit(50)

  const tabs = [
    { id: 'today',    label: 'Hoy' },
    { id: 'upcoming', label: 'Próximas' },
    { id: 'past',     label: 'Pasadas' },
    { id: 'all',      label: 'Todas' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">{appointments?.length ?? 0} citas</p>
        </div>
        <Link href="/appointments/new" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva cita
        </Link>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <Link key={t.id} href={`/appointments?tab=${t.id}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {!appointments || appointments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-500">Sin citas en esta vista</p>
          <Link href="/appointments/new" className="text-slate-600 text-sm hover:underline mt-2 inline-block">
            Agendar cita →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt: any) => {
            const s = APPT_STATUS[appt.status] ?? { label: appt.status, cls: 'bg-gray-50 text-gray-500' }
            const scheduledDate = new Date(appt.scheduled_at)
            const isToday = scheduledDate.toDateString() === new Date().toDateString()
            return (
              <div key={appt.id}
                className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 ${
                  isToday ? 'border-blue-200' : 'border-gray-200'
                }`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center min-w-16">
                    <p className="text-sm font-bold text-gray-900">
                      {scheduledDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {scheduledDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-300">{appt.duration_minutes} min</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {appt.customer?.first_name} {appt.customer?.last_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    {appt.vehicle && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        <span className="font-mono">{appt.vehicle.plate}</span> · {appt.vehicle.brand} {appt.vehicle.model}
                      </p>
                    )}
                    {appt.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{appt.notes}</p>}
                    {appt.work_order && (
                      <Link href={`/work-orders/${appt.ot_id}`}
                        className="text-xs text-slate-500 hover:underline">
                        OT-{appt.work_order.number}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {appt.status === 'scheduled' && (
                    <form action={updateAppointmentStatus}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button type="submit" className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors">
                        Confirmar
                      </button>
                    </form>
                  )}
                  {['scheduled', 'confirmed'].includes(appt.status) && !appt.work_order && (
                    <form action={convertToWorkOrder}>
                      <input type="hidden" name="appointment_id" value={appt.id} />
                      <button type="submit" className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg transition-colors">
                        → Crear OT
                      </button>
                    </form>
                  )}
                  {['scheduled', 'confirmed'].includes(appt.status) && (
                    <form action={updateAppointmentStatus}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <button type="submit" className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors">
                        Cancelar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
