import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('customer')
    .select(`id, first_name, last_name, phone, email, id_number, id_type, is_credit_enabled, created_at`)
    .is('deleted_at', null)
    .order('first_name', { ascending: true })

  if (q && q.length >= 2) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,id_number.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: customers } = await query.limit(50)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers?.length ?? 0} resultados</p>
        </div>
        <Link href="/customers/new" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nuevo cliente
        </Link>
      </div>

      <form method="get" className="mb-5">
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Buscar por nombre, teléfono, documento..."
          />
          <button type="submit" className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors">
            Buscar
          </button>
        </div>
      </form>

      {!customers || customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-medium text-gray-500">{q ? `Sin resultados para "${q}"` : 'Aún no hay clientes registrados'}</p>
          <Link href="/customers/new" className="text-slate-600 text-sm hover:underline mt-2 inline-block">Registrar primer cliente →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Crédito</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-slate-600">
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.id_number ? <><span className="text-xs text-gray-400">{c.id_type} </span>{c.id_number}</> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.is_credit_enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Sí</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
