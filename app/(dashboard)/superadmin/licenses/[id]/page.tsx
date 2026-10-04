import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { NumericInput } from '@/components/numeric-input'
import { updateLicensePlan } from '../actions'

export default async function EditLicensePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('license_plan')
    .select('*')
    .eq('id', id)
    .single()

  if (!plan) redirect('/superadmin/licenses')

  const updateWithId = updateLicensePlan.bind(null, id)
  const cls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent'

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/licenses" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">Editar plan — {plan.name}</h2>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={updateWithId} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del plan *</label>
          <input name="name" type="text" required defaultValue={plan.name} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
          <input name="description" type="text" defaultValue={plan.description ?? ''} className={cls} />
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Límites del plan</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Máx. sedes *
              <span className="ml-1 font-normal text-gray-400">(999 = ilimitadas)</span>
            </label>
            <NumericInput name="max_branches" defaultValue={plan.max_branches} min={1} max={999} required className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Máx. usuarios *
              <span className="ml-1 font-normal text-gray-400">(999 = ilimitados)</span>
            </label>
            <NumericInput name="max_users" defaultValue={plan.max_users} min={1} max={999} required className={cls} />
          </div>
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio mensual *</label>
            <NumericInput name="price_monthly" defaultValue={Number(plan.price_monthly)} min={0} required className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
            <select name="currency" defaultValue={plan.currency} className={cls}>
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Orden en lista</label>
            <NumericInput name="sort_order" defaultValue={plan.sort_order} min={1} className={cls} />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="is_active" value="false" />
              <input type="checkbox" name="is_active" value="true" defaultChecked={plan.is_active}
                className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Plan activo</span>
            </label>
          </div>
        </div>

        <button type="submit"
          className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}>
          Guardar cambios
        </button>
      </form>
    </div>
  )
}
