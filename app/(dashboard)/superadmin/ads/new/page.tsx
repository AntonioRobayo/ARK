import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createCampaign } from '../actions'
import { AdCampaignForm } from '@/components/ads/AdCampaignForm'

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

      <AdCampaignForm
        action={createCampaign}
        placements={placements ?? []}
        error={error}
        labels={{
          fieldPlacement:         t('fieldPlacement'),
          sectionAd:              t('sectionAd'),
          fieldTitle:             t('fieldTitle'),
          fieldImageUrl:          t('fieldImageUrl'),
          fieldImageUrlHint:      t('fieldImageUrlHint'),
          fieldLinkUrl:           t('fieldLinkUrl'),
          fieldLinkUrlHint:       t('fieldLinkUrlHint'),
          sectionAdvertiser:      t('sectionAdvertiser'),
          fieldAdvertiserName:    t('fieldAdvertiserName'),
          fieldAdvertiserContact: t('fieldAdvertiserContact'),
          sectionBilling:         t('sectionBilling'),
          fieldPrice:             t('fieldPrice'),
          fieldStartsAt:          t('fieldStartsAt'),
          fieldEndsAt:            t('fieldEndsAt'),
          fieldNotes:             t('fieldNotes'),
          submitBtn:              t('submitBtn'),
        }}
      />
    </div>
  )
}
