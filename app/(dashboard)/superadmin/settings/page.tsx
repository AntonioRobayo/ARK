import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { saveConfig } from './actions'
import { MaintenanceToggle } from './maintenance-toggle'

const CONFIG_KEYS = ['support_email', 'platform_name', 'terms_url', 'maintenance_mode'] as const

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('superadmin.settings')

  const { data: configs } = await supabase
    .from('platform_config')
    .select('key, value, description')

  const configMap = Object.fromEntries((configs ?? []).map(c => [c.key, c.value ?? '']))

  return (
    <div className="max-w-xl">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{t('description')}</p>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={saveConfig} className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {CONFIG_KEYS.map(key => (
          <div key={key} className="px-5 py-4">
            <label htmlFor={key} className="block text-sm font-semibold text-gray-800 mb-0.5">
              {t(`keys.${key}`)}
            </label>
            <p className="text-xs text-gray-400 mb-2">{t(`descriptions.${key}`)}</p>
            {key === 'maintenance_mode' ? (
              <MaintenanceToggle defaultValue={configMap[key] === 'true'} />
            ) : (
              <input
                id={key}
                name={key}
                defaultValue={configMap[key] ?? ''}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            )}
          </div>
        ))}
        <div className="px-5 py-4">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}
          >
            {t('saveBtn')}
          </button>
        </div>
      </form>
    </div>
  )
}
