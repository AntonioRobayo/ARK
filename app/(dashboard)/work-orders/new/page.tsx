import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ReceptionForm } from './reception-form'

// Paso 1: buscar cliente | Paso 2: seleccionar vehículo | Paso 3: formulario de recepción
// El estado viaja por URL params: ?customer_id=xxx&vehicle_id=yyy&appointment_id=zzz

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; vehicle_id?: string; q?: string; error?: string; appointment_id?: string }>
}) {
  const { customer_id, vehicle_id, q, error, appointment_id } = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('workOrders')

  // ── Paso 3: formulario de recepción ─────────────────────────────────────────
  if (customer_id && vehicle_id) {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: customer }, { data: vehicle }, { data: techs }, { data: checklistTemplates }] = await Promise.all([
      supabase.from('customer').select('id, first_name, last_name, phone').eq('id', customer_id).single(),
      supabase.from('vehicle').select('id, plate, brand, model, year, current_mileage').eq('id', vehicle_id).single(),
      supabase.from('user_profile').select('id, first_name, last_name').eq('is_active', true).not('role_id', 'is', null),
      supabase.from('checklist_template')
        .select('id, name, checklist_template_item(id, label, is_required, order_index)')
        .eq('stage', 'reception')
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1),
    ])

    if (!customer || !vehicle) redirect('/work-orders/new')

    const rawTemplate = checklistTemplates?.[0] ?? null
    const checklist = rawTemplate ? {
      id: rawTemplate.id,
      name: rawTemplate.name,
      items: ((rawTemplate as any).checklist_template_item ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index),
    } : null

    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/work-orders/new?customer_id=${customer_id}`} className="text-gray-400 hover:text-gray-600 text-sm">{t('new.changeVehicle')}</Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        {/* Resumen cliente + vehículo */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
            <p className="font-semibold text-gray-900">{customer.first_name} {customer.last_name}</p>
            <p className="text-sm text-gray-500">{customer.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vehículo</p>
            <p className="font-semibold text-gray-900">{vehicle.plate}</p>
            <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
          </div>
        </div>

        {appointment_id && (
          <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {t('new.appointmentLinked')}
          </div>
        )}

        <ReceptionForm
          customerId={customer_id}
          vehicleId={vehicle_id}
          appointmentId={appointment_id ?? null}
          currentMileage={vehicle.current_mileage ?? null}
          techs={techs ?? []}
          checklist={checklist}
        />
      </div>
    )
  }

  // ── Paso 2: seleccionar vehículo del cliente ─────────────────────────────────
  if (customer_id) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [{ data: customer }, { data: vehicles }, { data: todayAppointments }] = await Promise.all([
      supabase.from('customer').select('id, first_name, last_name, phone').eq('id', customer_id).single(),
      supabase.from('vehicle').select('id, plate, brand, model, year, vehicle_type').eq('customer_id', customer_id).order('created_at', { ascending: false }),
      supabase.from('appointment')
        .select('id, scheduled_at, notes, vehicle_id, vehicle:vehicle_id(id, plate, brand, model)')
        .eq('customer_id', customer_id)
        .eq('status', 'confirmed')
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at'),
    ])

    if (!customer) redirect('/work-orders/new')

    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/work-orders/new" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.changeCustomer')}</Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('new.selectVehicle')}</h1>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('new.selectedCustomer')}</p>
          <p className="font-semibold text-gray-900">{customer.first_name} {customer.last_name}</p>
          <p className="text-sm text-gray-500">{customer.phone}</p>
        </div>

        {/* Citas confirmadas de hoy */}
        {todayAppointments && todayAppointments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">{t('new.appointmentsToday')}</p>
            <div className="space-y-2">
              {todayAppointments.map((appt: any) => {
                const apptVehicle = appt.vehicle as any
                const time = new Date(appt.scheduled_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                return (
                  <Link
                    key={appt.id}
                    href={`/work-orders/new?customer_id=${customer_id}&vehicle_id=${appt.vehicle_id}&appointment_id=${appt.id}`}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {apptVehicle?.plate ?? '—'} · {apptVehicle?.brand} {apptVehicle?.model}
                      </p>
                      <p className="text-xs text-blue-600">{time} · {appt.notes ?? t('new.appointmentNoNotes')}</p>
                    </div>
                    <span className="text-blue-300 text-xl">›</span>
                  </Link>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 mb-4">{t('new.appointmentsOrChoose')}</p>
          </div>
        )}

        {!vehicles || vehicles.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-3">🏍</p>
            <p className="text-gray-500 font-medium">{t('new.noVehicles')}</p>
            <Link
              href={`/vehicles/new?customer_id=${customer_id}&redirect=/work-orders/new?customer_id=${customer_id}`}
              className="mt-3 inline-block text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {t('new.registerVehicle')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v: any) => (
              <Link
                key={v.id}
                href={`/work-orders/new?customer_id=${customer_id}&vehicle_id=${v.id}`}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-mono font-bold text-gray-900 text-lg">{v.plate ?? '—'}</p>
                  <p className="text-sm text-gray-500">{v.brand} {v.model} {v.year}</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </Link>
            ))}
            <Link
              href={`/vehicles/new?customer_id=${customer_id}&redirect=/work-orders/new?customer_id=${customer_id}`}
              className="flex items-center justify-center p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-slate-400 hover:text-slate-600 transition-all"
            >
              {t('new.addVehicle')}
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Paso 1: buscar cliente ────────────────────────────────────────────────────
  let customers: any[] = []
  if (q && q.length >= 2) {
    const { data } = await supabase
      .from('customer')
      .select('id, first_name, last_name, phone, id_number')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,id_number.ilike.%${q}%`)
      .limit(10)
    customers = data ?? []
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/work-orders" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      <p className="text-gray-500 text-sm mb-6">{t('new.searchHint')}</p>

      {/* Búsqueda */}
      <form method="get" className="mb-6">
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder={t('new.searchPlaceholder')}
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
          >
            {t('new.search')}
          </button>
        </div>
      </form>

      {/* Resultados */}
      {q && q.length >= 2 && (
        <>
          {customers.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="font-medium text-gray-500">{t('new.noResults', { q })}</p>
              <Link
                href={`/customers/new?redirect=/work-orders/new`}
                className="mt-3 inline-block text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                {t('new.registerCustomer')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/work-orders/new?customer_id=${c.id}`}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-gray-400">{c.phone}{c.id_number ? ` · ${c.id_number}` : ''}</p>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </Link>
              ))}
              <Link
                href={`/customers/new?redirect=/work-orders/new`}
                className="flex items-center justify-center p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-slate-400 hover:text-slate-600 transition-all"
              >
                {t('new.addCustomer')}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
