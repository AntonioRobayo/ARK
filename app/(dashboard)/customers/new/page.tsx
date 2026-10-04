import Link from 'next/link'
import { createCustomer } from './actions'

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  const { error, redirect: redirectTo } = await searchParams

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600 text-sm">← Clientes</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createCustomer} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
        <input type="hidden" name="redirect_to" value={redirectTo ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
            <input name="first_name" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Juan" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
            <input name="last_name" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="García" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de documento</label>
            <select name="id_type" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">— Seleccionar —</option>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="NIT">NIT</option>
              <option value="PP">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de documento</label>
            <input name="id_number" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="1234567890" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
            <input name="phone" type="tel"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="3001234567" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input name="email" type="email"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="juan@ejemplo.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
          <input name="address" type="text"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Calle 123 # 45-67, Bogotá" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas internas</label>
          <textarea name="notes" rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder="Preferencias, observaciones especiales..." />
        </div>

        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          Registrar cliente
        </button>
      </form>
    </div>
  )
}
