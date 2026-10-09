import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { toggleCampaign } from './actions'
import { AdSubNav } from './sub-nav'

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const adminClient = createAdminClient()
  const t = await getTranslations('superadmin.ads')

  const { data: ads } = await adminClient
    .from('ads')
    .select('id, title, image_url, link_url, advertiser_name, advertiser_contact, starts_at, ends_at, price_paid, currency, is_active, notes, placement_id, ad_placements(name, slug, width, height)')
    .order('created_at', { ascending: false })

  const now = new Date()

  function statusLabel(ad: { is_active: boolean; starts_at: string; ends_at: string }) {
    if (!ad.is_active) return { label: t('campaigns.inactive'), color: 'text-gray-400' }
    const start = new Date(ad.starts_at)
    const end   = new Date(ad.ends_at)
    if (now < start) return { label: t('campaigns.scheduled'), color: 'text-blue-500' }
    if (now > end)   return { label: t('campaigns.expired'),   color: 'text-red-400' }
    return { label: t('campaigns.active'), color: 'text-emerald-600' }
  }

  return (
    <div>
      <AdSubNav active="campaigns" />

      {success && <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{decodeURIComponent(success)}</div>}
      {error   && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{t('campaigns.count', { n: ads?.length ?? 0 })}</p>
        <Link href="/superadmin/ads/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#FF7316' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('campaigns.newBtn')}
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.ad')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.placement')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.advertiser')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.dates')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.price')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('campaigns.table.status')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(ads ?? []).map(ad => {
              const placement = ad.ad_placements as unknown as { name: string; slug: string; width: number; height: number } | null
              const status = statusLabel(ad)
              return (
                <tr key={ad.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {ad.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.image_url} alt={ad.title}
                          className="w-14 h-8 object-cover rounded border border-gray-100 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{ad.title}</p>
                        {ad.link_url && <p className="text-xs text-gray-400 truncate max-w-[180px]">{ad.link_url}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {placement
                      ? <div>
                          <p className="text-sm text-gray-700">{placement.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{placement.width}×{placement.height}</p>
                        </div>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-800">{ad.advertiser_name}</p>
                    {ad.advertiser_contact && <p className="text-xs text-gray-400">{ad.advertiser_contact}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    <p>{new Date(ad.starts_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                    <p>→ {new Date(ad.ends_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">
                    {ad.price_paid != null
                      ? `${ad.price_paid.toLocaleString('en-US', { style: 'currency', currency: ad.currency ?? 'USD' })}`
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <form action={toggleCampaign}>
                      <input type="hidden" name="id" value={ad.id} />
                      <input type="hidden" name="is_active" value={String(ad.is_active)} />
                      <button type="submit"
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          ad.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}>
                        {ad.is_active ? t('campaigns.deactivate') : t('campaigns.activate')}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {(!ads || ads.length === 0) && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">{t('campaigns.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
