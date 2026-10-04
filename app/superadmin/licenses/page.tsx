import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function LicensesPage() {
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('license_plan')
    .select('*')
    .order('sort_order')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{plans?.length ?? 0} planes activos</p>
        <Link
          href="/superadmin/licenses/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#FF7316' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo plan
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans?.map(plan => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{plan.name}</h3>
                {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!plan.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                )}
                <Link
                  href={`/superadmin/licenses/${plan.id}`}
                  className="text-xs font-medium px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Editar
                </Link>
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-900 mb-1">
              {plan.price_monthly > 0
                ? `$${Number(plan.price_monthly).toLocaleString('es-CO')}`
                : <span className="text-gray-400">Sin precio</span>}
              {plan.price_monthly > 0 && <span className="text-sm font-normal text-gray-400 ml-1">/ mes</span>}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Sedes
                </span>
                <span className="font-semibold text-gray-800">{plan.max_branches === 999 ? 'Ilimitadas' : plan.max_branches}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  Usuarios
                </span>
                <span className="font-semibold text-gray-800">{plan.max_users === 999 ? 'Ilimitados' : plan.max_users}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Moneda</span>
                <span className="font-semibold text-gray-800">{plan.currency}</span>
              </div>
            </div>
          </div>
        ))}

        {(!plans || plans.length === 0) && (
          <div className="col-span-3 bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-400">No hay planes creados</p>
          </div>
        )}
      </div>
    </div>
  )
}
