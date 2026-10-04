import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createVehicle } from './actions'

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; error?: string; redirect?: string }>
}) {
  const { customer_id, error, redirect: redirectTo } = await searchParams
  const supabase = await createClient()

  // Si viene con customer_id, mostramos el nombre del cliente
  let customer = null
  if (customer_id) {
    const { data } = await supabase
      .from('customer')
      .select('id, first_name, last_name')
      .eq('id', customer_id)
      .single()
    customer = data
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={customer_id ? `/customers/${customer_id}` : '/vehicles'} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900">Registrar vehículo</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {customer && (
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <span className="text-gray-500">Cliente: </span>
          <span className="font-semibold text-gray-900">{customer.first_name} {customer.last_name}</span>
        </div>
      )}

      <form action={createVehicle} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
        <input type="hidden" name="customer_id" value={customer_id ?? ''} />
        <input type="hidden" name="redirect_to" value={redirectTo ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Placa</label>
            <input name="plate" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="ABC123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de vehículo</label>
            <select name="vehicle_type" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="motorcycle">Motocicleta</option>
              <option value="scooter">Scooter</option>
              <option value="atv">ATV / Cuatrimoto</option>
              <option value="car">Automóvil</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca *</label>
            <input name="brand" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Honda" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modelo *</label>
            <input name="model" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="CB190R" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Año</label>
            <input name="year" type="number" min="1990" max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="2022" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
            <input name="color" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Rojo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cilindraje (cc)</label>
            <input name="engine_cc" type="number" min="50"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="190" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kilometraje actual</label>
            <input name="current_mileage" type="number" min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="12500" />
          </div>
        </div>

        {/* Si no viene con customer_id, buscar cliente */}
        {!customer_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ID del cliente (opcional)</label>
            <input name="customer_id_manual" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Dejar vacío si se registra sin cliente" />
            <p className="text-xs text-gray-400 mt-1">O primero crea el cliente en <Link href="/customers/new" className="text-slate-600 hover:underline">Clientes</Link></p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
          <textarea name="notes" rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder="Modificaciones, accesorios, observaciones..." />
        </div>

        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          Registrar vehículo
        </button>
      </form>
    </div>
  )
}
