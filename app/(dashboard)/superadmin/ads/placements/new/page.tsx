import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createPlacement } from '../../actions'

export default async function NewPlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('superadmin.ads.placements.new')

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/ads/placements" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
      </div>

      {error && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <form action={createPlacement} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldName')}</label>
            <input name="name" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Banner Dashboard" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldSlug')}</label>
            <input name="slug" required pattern="[a-z0-9_]+"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
              placeholder="dashboard_banner" />
            <p className="text-xs text-gray-400 mt-1">{t('fieldSlugHint')}</p>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldDescription')}</label>
            <textarea name="description" rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              placeholder="Banner horizontal en la parte superior del dashboard" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldLocationHint')}</label>
            <input name="location_hint"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
              placeholder="app/(dashboard)/page.tsx" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldWidth')}</label>
            <input name="width" type="number" min="1" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="728" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldHeight')}</label>
            <input name="height" type="number" min="1" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="90" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldFormats')}</label>
            <input name="accepted_formats" defaultValue="JPG, PNG, WebP"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldMaxSize')}</label>
            <input name="max_file_size_kb" type="number" min="1" defaultValue="500"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldPriceWeek')}</label>
            <input name="price_per_week" type="number" step="0.01" min="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="25.00" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldPriceMonth')}</label>
            <input name="price_per_month" type="number" step="0.01" min="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="80.00" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#FF7316' }}>
            {t('submitBtn')}
          </button>
          <Link href="/superadmin/ads/placements"
            className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
