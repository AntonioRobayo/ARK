import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createTenantAndInvite } from './actions'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('license_plan')
    .select('id, name, max_branches, max_users, price_monthly, currency')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">Registrar nuevo taller</h2>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {success && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {decodeURIComponent(success)}
        </div>
      )}

      <form action={createTenantAndInvite} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del taller *</label>
          <input name="workshop_name" type="text" required placeholder="Taller Moto Express"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
            <input name="country_code" type="text" maxLength={2} defaultValue="CO"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
            <input name="currency_code" type="text" maxLength={3} defaultValue="COP"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona horaria</label>
          <input name="timezone" type="text" defaultValue="America/Bogota"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Licencia</p>

        <div className="space-y-2">
          {plans?.map(plan => (
            <label key={plan.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-orange-300 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <input type="radio" name="plan_id" value={plan.id} required
                  className="accent-orange-500 w-4 h-4" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{plan.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plan.max_branches === 999 ? 'Sedes ilimitadas' : `${plan.max_branches} sede${plan.max_branches !== 1 ? 's' : ''}`}
                    {' · '}
                    {plan.max_users === 999 ? 'Usuarios ilimitados' : `${plan.max_users} usuarios`}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-700">
                {Number(plan.price_monthly) > 0
                  ? `$${Number(plan.price_monthly).toLocaleString('es-CO')} ${plan.currency}/mes`
                  : <span className="text-gray-400 font-normal text-xs">Sin precio</span>}
              </span>
            </label>
          ))}
          {(!plans || plans.length === 0) && (
            <p className="text-sm text-red-500">
              No hay planes activos. <Link href="/superadmin/licenses/new" className="underline">Crea uno primero.</Link>
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email del administrador del taller *
          </label>
          <input name="admin_email" type="email" required placeholder="admin@tallermotoexpress.com"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          <p className="mt-1.5 text-xs text-gray-400">
            Se enviará un correo de invitación con instrucciones para configurar el acceso.
          </p>
        </div>

        <button type="submit"
          className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}>
          Crear taller y enviar invitación
        </button>
      </form>
    </div>
  )
}
