import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createWorkOrder } from './actions'
import { getTranslations } from 'next-intl/server'

// Paso 1: buscar cliente | Paso 2: seleccionar vehículo | Paso 3: formulario de recepción
// El estado viaja por URL params: ?customer_id=xxx&vehicle_id=yyy

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; vehicle_id?: string; q?: string; error?: string }>
}) {
  const { customer_id, vehicle_id, q, error } = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('workOrders')

  // ── Paso 3: formulario de recepción ─────────────────────────────────────────
  if (customer_id && vehicle_id) {
    const [{ data: customer }, { data: vehicle }, { data: techs }] = await Promise.all([
      supabase.from('customer').select('id, first_name, last_name, phone').eq('id', customer_id).single(),
      supabase.from('vehicle').select('id, plate, brand, model, year, current_mileage').eq('id', vehicle_id).single(),
      supabase.from('user_profile').select('id, first_name, last_name').eq('is_active', true).not('role_id', 'is', null),
    ])

    if (!customer || !vehicle) redirect('/work-orders/new')

    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/work-orders/new" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.changeVehicle')}</Link>
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

        <form action={createWorkOrder} className="space-y-5">
          <input type="hidden" name="customer_id" value={customer_id} />
          <input type="hidden" name="vehicle_id" value={vehicle_id} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.km')}</label>
              <input
                name="reception_mileage"
                type="number"
                min="0"
                defaultValue={vehicle.current_mileage ?? ''}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="ej. 12500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.priority')}</label>
              <select
                name="priority"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              >
                <option value="normal">{t('priority.normal')}</option>
                <option value="high">{t('priority.high')}</option>
                <option value="urgent">{t('priority.urgent')}</option>
                <option value="low">{t('priority.low')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.fuel')}</label>
              <input
                name="fuel_level"
                type="number"
                min="0" max="8"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="0–8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.battery')}</label>
              <input
                name="battery_level"
                type="number"
                min="0" max="10"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="0–10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.technician')}</label>
              <select
                name="technician_id"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              >
                <option value="">{t('unassigned')}</option>
                {(techs ?? []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.estimatedDelivery')}</label>
              <input
                name="estimated_delivery_at"
                type="datetime-local"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.observations')}</label>
            <textarea
              name="reception_notes"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
              placeholder={t('new.observationsPlaceholder')}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors"
          >
            {t('new.create')}
          </button>
        </form>
      </div>
    )
  }

  // ── Paso 2: seleccionar vehículo del cliente ─────────────────────────────────
  if (customer_id) {
    const [{ data: customer }, { data: vehicles }] = await Promise.all([
      supabase.from('customer').select('id, first_name, last_name, phone').eq('id', customer_id).single(),
      supabase.from('vehicle').select('id, plate, brand, model, year, vehicle_type').eq('customer_id', customer_id).order('created_at', { ascending: false }),
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
