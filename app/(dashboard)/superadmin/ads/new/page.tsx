import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createCampaign } from '../actions'

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('superadmin.ads.campaigns.new')

  const { data: placements } = await supabase
    .from('ad_placements')
    .select('id, name, slug, width, height, price_per_week, price_per_month')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/ads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
      </div>

      {error && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <form action={createCampaign} className="space-y-5">

        {/* Espacio publicitario */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">{t('fieldPlacement')}</p>
          <div className="grid grid-cols-1 gap-2">
            {(placements ?? []).map(p => (
              <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
                <input type="radio" name="placement_id" value={p.id} required className="accent-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.width}×{p.height}px
                    {p.price_per_week && <span className="ml-2 text-orange-600">${p.price_per_week}/sem · ${p.price_per_month}/mes</span>}
                  </p>
                </div>
              </label>
            ))}
            {(!placements || placements.length === 0) && (
              <p className="text-sm text-gray-400 py-2">No hay espacios publicitarios activos. <Link href="/superadmin/ads/placements/new" className="text-orange-600 underline">Crear uno</Link>.</p>
            )}
          </div>
        </div>

        {/* Creatividad */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sectionAd')}</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldTitle')}</label>
            <input name="title" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Banner Repuestos Toro — Oct 2026" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldImageUrl')}</label>
            <input name="image_url" type="url" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="https://cdn.example.com/banner.jpg" />
            <p className="text-xs text-gray-400 mt-1">{t('fieldImageUrlHint')}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldLinkUrl')}</label>
            <input name="link_url" type="url" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="https://repuestostoro.com" />
            <p className="text-xs text-gray-400 mt-1">{t('fieldLinkUrlHint')}</p>
          </div>
        </div>

        {/* Anunciante */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sectionAdvertiser')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldAdvertiserName')}</label>
              <input name="advertiser_name" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Repuestos Toro S.A.S." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldAdvertiserContact')}</label>
              <input name="advertiser_contact" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="ventas@repuestostoro.com" />
            </div>
          </div>
        </div>

        {/* Precio y fechas */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sectionBilling')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldPrice')}</label>
              <div className="flex gap-2">
                <input name="price_paid" type="number" step="0.01" min="0" required
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="80.00" />
                <select name="currency"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldStartsAt')}</label>
              <input name="starts_at" type="datetime-local" required
                defaultValue={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldEndsAt')}</label>
              <input name="ends_at" type="datetime-local" required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldNotes')}</label>
            <textarea name="notes" rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              placeholder="Contrato firmado, pago recibido el..." />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#FF7316' }}>
            {t('submitBtn')}
          </button>
          <Link href="/superadmin/ads"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
