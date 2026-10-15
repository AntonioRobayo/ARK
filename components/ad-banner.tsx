import { createClient } from '@/lib/supabase/server'

export async function AdBanner({ placementSlug }: { placementSlug: string }) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: ad } = await supabase
    .from('ads')
    .select('id, title, image_url, link_url, ad_placements!inner(slug, width, height)')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .eq('ad_placements.slug', placementSlug)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!ad) return null

  const placement = ad.ad_placements as unknown as { slug: string; width: number; height: number }

  const banner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ad.image_url}
      alt={ad.title}
      width={placement.width}
      height={placement.height}
      className="w-full h-auto rounded-lg block"
    />
  )

  return (
    <div style={{ maxWidth: placement.width, margin: '12px auto' }}>
      {ad.link_url
        ? <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block">{banner}</a>
        : banner
      }
    </div>
  )
}
