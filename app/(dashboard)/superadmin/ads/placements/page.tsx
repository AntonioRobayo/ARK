import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { togglePlacement } from '../actions'
import { AdSubNav } from '../sub-nav'

export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const adminClient = createAdminClient()
  const t = await getTranslations('superadmin.ads')

  const { data: placements } = await adminClient
    .from('ad_placements')
    .select('id, name, slug, description, location_hint, width, height, price_per_week, price_per_month, accepted_formats, max_file_size_kb, is_active')
    .order('sort_order')

  return (
    <div>
      <AdSubNav active="placements" />

      {success && <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{decodeURIComponent(success)}</div>}
      {error   && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{t('placements.count', { n: placements?.length ?? 0 })}</p>
        <Link href="/superadmin/ads/placements/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#FF7316' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('placements.newBtn')}
        </Link>
      </div>

      <div className="space-y-3">
        {(placements ?? []).map(pl => (
          <div key={pl.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-gray-900">{pl.name}</h3>
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{pl.slug}</span>
                  <span className={`text-xs font-medium ${pl.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {pl.is_active ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>
                {pl.description && <p className="text-sm text-gray-500 mb-3">{pl.description}</p>}

                {/* Spec sheet */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('placements.specsTitle')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Dimensiones</p>
                      <p className="text-sm font-semibold text-gray-800">{pl.width} × {pl.height} px</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Formatos</p>
                      <p className="text-sm font-semibold text-gray-800">{pl.accepted_formats}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Peso máximo</p>
                      <p className="text-sm font-semibold text-gray-800">{pl.max_file_size_kb} KB</p>
                    </div>
                    {pl.location_hint && (
                      <div>
                        <p className="text-xs text-gray-400">Ubicación</p>
                        <p className="text-sm font-mono text-gray-600">{pl.location_hint}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                {(pl.price_per_week || pl.price_per_month) && (
                  <div className="flex gap-4">
                    {pl.price_per_week  && <p className="text-sm"><span className="text-gray-400">Semana:</span> <strong className="text-gray-800">${pl.price_per_week} USD</strong></p>}
                    {pl.price_per_month && <p className="text-sm"><span className="text-gray-400">Mes:</span> <strong className="text-gray-800">${pl.price_per_month} USD</strong></p>}
                  </div>
                )}
              </div>

              <form action={togglePlacement}>
                <input type="hidden" name="id" value={pl.id} />
                <input type="hidden" name="is_active" value={String(pl.is_active)} />
                <button type="submit"
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                    pl.is_active
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}>
                  {pl.is_active ? t('placements.deactivate') : t('placements.activate')}
                </button>
              </form>
            </div>
          </div>
        ))}
        {(!placements || placements.length === 0) && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
            <p className="text-sm text-gray-400">{t('placements.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
