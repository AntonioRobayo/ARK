import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createVehicle } from './actions'
import { getTranslations } from 'next-intl/server'

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

  const t = await getTranslations('vehicles')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={customer_id ? `/customers/${customer_id}` : '/vehicles'} className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {customer && (
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <span className="font-semibold text-gray-900">{t('new.customerLabel', { name: `${customer.first_name} ${customer.last_name}` })}</span>
        </div>
      )}

      <form action={createVehicle} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
        <input type="hidden" name="customer_id" value={customer_id ?? ''} />
        <input type="hidden" name="redirect_to" value={redirectTo ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.plate')}</label>
            <input name="plate" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="ABC123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.type')}</label>
            <select name="vehicle_type" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="motorcycle">{t('new.types.motorcycle')}</option>
              <option value="scooter">{t('new.types.scooter')}</option>
              <option value="atv">{t('new.types.atv')}</option>
              <option value="car">{t('new.types.car')}</option>
              <option value="other">{t('new.types.other')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.brand')}</label>
            <input name="brand" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Honda" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.model')}</label>
            <input name="model" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="CB190R" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.year')}</label>
            <input name="year" type="number" min="1990" max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="2022" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.color')}</label>
            <input name="color" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Rojo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.engineCC')}</label>
            <input name="engine_cc" type="number" min="50"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="190" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.mileage')}</label>
            <input name="current_mileage" type="number" min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="12500" />
          </div>
        </div>

        {/* Si no viene con customer_id, buscar cliente */}
        {!customer_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.customerId')}</label>
            <input name="customer_id_manual" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder={t('new.customerIdPlaceholder')} />
            <p className="text-xs text-gray-400 mt-1">{t('new.createCustomerFirst')} <Link href="/customers/new" className="text-slate-600 hover:underline">Clientes</Link></p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.notes')}</label>
          <textarea name="notes" rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder={t('new.notesPlaceholder')} />
        </div>

        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          {t('new.submit')}
        </button>
      </form>
    </div>
  )
}
