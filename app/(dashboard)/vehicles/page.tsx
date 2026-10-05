import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('vehicle')
    .select(`id, plate, brand, model, year, color, vehicle_type, current_mileage, customer:customer_id(id, first_name, last_name, phone)`)
    .order('created_at', { ascending: false })

  if (q && q.length >= 2) {
    query = query.or(`plate.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
  }

  const { data: vehicles } = await query.limit(50)
  const t = await getTranslations('vehicles')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('count', { n: vehicles?.length ?? 0 })}</p>
        </div>
        <Link href="/vehicles/new" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {t('newBtn')}
        </Link>
      </div>

      <form method="get" className="mb-5">
        <div className="flex gap-2">
          <input name="q" type="search" defaultValue={q}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder={t('searchPlaceholder')} />
          <button type="submit" className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors">
            {t('search')}
          </button>
        </div>
      </form>

      {!vehicles || vehicles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏍</p>
          <p className="font-medium text-gray-500">{q ? t('noResults', { q }) : t('empty')}</p>
          <Link href="/vehicles/new" className="text-slate-600 text-sm hover:underline mt-2 inline-block">{t('createFirst')}</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.plate')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.vehicle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.customer')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.mileage')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.color')}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v: any) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/vehicles/${v.id}`} className="font-mono font-bold text-gray-900 hover:text-slate-600">
                      {v.plate ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{v.brand} {v.model}</div>
                    <div className="text-xs text-gray-400">{v.year} · {v.vehicle_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    {v.customer ? (
                      <Link href={`/customers/${v.customer.id}`} className="text-gray-700 hover:text-slate-600">
                        {v.customer.first_name} {v.customer.last_name}
                      </Link>
                    ) : <span className="text-gray-300">{t('noCustomer')}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.current_mileage ? `${v.current_mileage.toLocaleString()} km` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{v.color ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
