import Link from 'next/link'
import { createTenantAndInvite } from './actions'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  return (
    <div className="max-w-xl">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/superadmin" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-white">Registrar nuevo taller</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-xl text-sm text-red-400">
          {decodeURIComponent(error)}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-950 border border-green-800 rounded-xl text-sm text-green-400">
          {decodeURIComponent(success)}
        </div>
      )}

      <form action={createTenantAndInvite} className="bg-gray-900 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Nombre del taller *
          </label>
          <input
            name="workshop_name"
            type="text"
            required
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Taller Moto Express"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Plan *</label>
            <select
              name="plan"
              required
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">País</label>
            <input
              name="country_code"
              type="text"
              maxLength={2}
              defaultValue="CO"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="CO"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Moneda</label>
            <input
              name="currency_code"
              type="text"
              maxLength={3}
              defaultValue="COP"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="COP"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Zona horaria</label>
          <input
            name="timezone"
            type="text"
            defaultValue="America/Bogota"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>

        <hr className="border-gray-800" />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Email del administrador del taller *
          </label>
          <input
            name="admin_email"
            type="email"
            required
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="admin@tallermotoexpress.com"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Se enviará un correo de invitación con instrucciones para configurar el acceso.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          Crear taller y enviar invitación
        </button>
      </form>
    </div>
  )
}
