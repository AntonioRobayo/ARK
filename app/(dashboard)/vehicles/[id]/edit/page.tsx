import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getCatalog } from '@/lib/catalog'
import { CatalogCombobox } from '@/components/CatalogCombobox'
import { updateVehicle } from './actions'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: vehicle } = await adminClient
    .from('vehicle')
    .select('*')
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  const t = await getTranslations('vehicles')

  const [vehicleTypes, fuelTypes, vehicleBrands] = await Promise.all([
    getCatalog('vehicle_type'),
    getCatalog('fuel_type'),
    getCatalog('vehicle_brand'),
  ])

  const action = updateVehicle.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/vehicles/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">{t('edit.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('edit.title')}</h1>
        <span className="text-gray-400 font-mono">{vehicle.plate}</span>
      </div>

      <form action={action} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.plate')}</label>
            <input name="plate" type="text" defaultValue={vehicle.plate ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="ABC123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.type')}</label>
            <CatalogCombobox
              name="vehicle_type"
              options={vehicleTypes}
              defaultValue={vehicle.vehicle_type ?? 'motorcycle'}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.brand')}</label>
            <CatalogCombobox
              name="brand"
              options={vehicleBrands}
              defaultValue={vehicle.brand ?? ''}
              placeholder="Honda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.model')}</label>
            <input name="model" type="text" required defaultValue={vehicle.model ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="CB190R" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.year')}</label>
            <input name="year" type="number" min="1990" max={new Date().getFullYear() + 1}
              defaultValue={vehicle.year ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="2022" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.color')}</label>
            <input name="color" type="text" defaultValue={vehicle.color ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Rojo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.engineCC')}</label>
            <input name="engine_cc" type="number" min="50"
              defaultValue={vehicle.engine_cc ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="190" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('new.mileage')}
              <span className="ml-1 text-xs text-gray-400 font-normal">({t('edit.mileageNote')})</span>
            </label>
            <input name="current_mileage" type="number" min="0"
              defaultValue={vehicle.current_mileage ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="12500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.fuelType')}</label>
            <CatalogCombobox
              name="fuel_type"
              options={[{ value: '', label: t('new.fuelTypeUnknown') }, ...fuelTypes]}
              defaultValue={vehicle.fuel_type ?? ''}
              placeholder={t('new.fuelTypeUnknown')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.vin')}</label>
            <input name="vin" type="text" defaultValue={vehicle.vin ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Número de chasis, serie o VIN" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.notes')}</label>
          <textarea name="notes" rows={2} defaultValue={vehicle.notes ?? ''}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder={t('new.notesPlaceholder')} />
        </div>

        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          {t('edit.submit')}
        </button>
      </form>
    </div>
  )
}
