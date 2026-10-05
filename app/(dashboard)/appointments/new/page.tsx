import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createAppointment } from '../actions'
import { getTranslations } from 'next-intl/server'

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; vehicle_id?: string; error?: string }>
}) {
  const { customer_id, vehicle_id, error } = await searchParams
  const supabase = await createClient()

  const [{ data: customers }, { data: vehicles }] = await Promise.all([
    supabase.from('customer').select('id, first_name, last_name, phone').order('first_name'),
    customer_id
      ? supabase.from('vehicle').select('id, plate, brand, model').eq('customer_id', customer_id)
      : Promise.resolve({ data: [] }),
  ])

  // Fecha por defecto: mañana a las 9am
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  const defaultDate = tomorrow.toISOString().slice(0, 16)
  const t = await getTranslations('appointments')

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/appointments" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createAppointment} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.customer')}</label>
          <select name="customer_id" required defaultValue={customer_id ?? ''}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="">{t('new.customerPlaceholder')}</option>
            {(customers ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.phone ? `· ${c.phone}` : ''}</option>
            ))}
          </select>
        </div>

        {(vehicles ?? []).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.vehicle')}</label>
            <select name="vehicle_id" defaultValue={vehicle_id ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">{t('new.vehiclePlaceholder')}</option>
              {(vehicles ?? []).map((v: any) => (
                <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.datetime')}</label>
            <input name="scheduled_at" type="datetime-local" required defaultValue={defaultDate}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.duration')}</label>
            <input name="duration_minutes" type="number" min="15" step="15" defaultValue="60"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.notes')}</label>
          <textarea name="notes" rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder={t('new.notesPlaceholder')} />
        </div>

        <button type="submit"
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          {t('new.submit')}
        </button>
      </form>
    </div>
  )
}
