import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { completeOnboarding } from './actions'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant_id?: string; error?: string }>
}) {
  const { tenant_id, error } = await searchParams

  if (!tenant_id) redirect('/auth/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Obtener datos del tenant para mostrar el nombre del taller
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant_id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">DA Workshop</h1>
          <p className="text-slate-400 mt-1 text-sm">Configuración inicial</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Bienvenido</h2>
            {tenant && (
              <p className="text-gray-500 text-sm mt-1">
                Estás activando el acceso a <span className="font-medium text-gray-700">{tenant.name}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={completeOnboarding} className="space-y-4">
            <input type="hidden" name="tenant_id" value={tenant_id} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  name="first_name"
                  type="text"
                  required
                  defaultValue={user.user_metadata?.first_name ?? ''}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  name="last_name"
                  type="text"
                  defaultValue={user.user_metadata?.last_name ?? ''}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="García"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Correo registrado: <span className="font-medium">{user.email}</span>
            </p>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              Activar mi cuenta →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
