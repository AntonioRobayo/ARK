import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SuperAdminPage() {
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Talleres registrados</h1>
          <p className="text-gray-500 text-sm mt-1">{tenants?.length ?? 0} tenants activos</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          + Nuevo taller
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Taller</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Slug</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Plan</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Estado</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((t) => (
              <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-5 py-3 text-white font-medium">{t.name}</td>
                <td className="px-5 py-3 text-gray-400">{t.slug}</td>
                <td className="px-5 py-3">
                  <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                    {t.plan}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${t.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                    {t.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString('es-CO')}
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-600">
                  No hay talleres registrados aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
