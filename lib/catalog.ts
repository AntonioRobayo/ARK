import { createAdminClient } from '@/lib/supabase/admin'

export type CatalogEntry = { value: string; label: string; is_system: boolean }

export async function getCatalog(category: string, locale = 'es'): Promise<CatalogEntry[]> {
  const admin = createAdminClient()
  const labelCol = locale === 'en' ? 'label_en' : locale === 'pt' ? 'label_pt' : 'label_es'
  const { data } = await admin
    .from('global_catalog')
    .select(`value, ${labelCol}, is_system`)
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order')
  return (data ?? []).map(r => ({
    value: r.value,
    label: (r as Record<string, string>)[labelCol] || r.value,
    is_system: r.is_system,
  }))
}

export async function ensureCatalogValue(category: string, value: string, labelEs: string) {
  if (!value?.trim()) return
  const admin = createAdminClient()
  await admin.from('global_catalog').upsert(
    { category, value: value.trim(), label_es: labelEs.trim(), is_active: true },
    { onConflict: 'category,value', ignoreDuplicates: true }
  )
}
