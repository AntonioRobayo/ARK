import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CsvImportClient } from './CsvImportClient'

type SearchParams = Promise<{ error?: string; skus?: string }>

export default async function InventoryImportPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, skus } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id').eq('id', user!.id).single()

  const [{ data: units }, { data: existingItems }] = await Promise.all([
    admin.from('unit_catalog').select('id, key, label_es').eq('is_active', true).order('sort_order'),
    admin
      .from('inventory_item')
      .select('sku')
      .eq('tenant_id', profile!.tenant_id)
      .is('deleted_at', null)
      .not('sku', 'is', null),
  ])

  const existingSkus = (existingItems ?? []).map(r => r.sku!).filter(Boolean)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">← Inventario</Link>
        <h1 className="text-2xl font-bold text-gray-900">Importar inventario</h1>
      </div>

      <CsvImportClient
        units={units ?? []}
        existingSkus={existingSkus}
        importError={error}
        duplicateSkus={skus ? skus.split(',') : undefined}
      />
    </div>
  )
}
