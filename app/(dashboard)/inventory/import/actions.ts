'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateDefaultLocation } from '../actions'

export interface ImportRow {
  name: string
  sku: string | null
  internal_code: string | null
  type: string
  unit_id: string | null
  unit_of_measure: string
  sale_price: number | null
  cost_price: number | null
  min_stock: number
  initial_stock: number
  description: string | null
  bin_location: string | null
}

export async function bulkImportItems(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profile').select('tenant_id, branch_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const tenantId = profile.tenant_id
  const rawRows = formData.get('rows') as string
  if (!rawRows) return

  let rows: ImportRow[]
  try {
    rows = JSON.parse(rawRows)
  } catch {
    redirect('/inventory/import?error=json_parse')
  }

  if (!rows.length) redirect('/inventory/import?error=empty')

  // Check SKU uniqueness against existing items
  const skusToCheck = rows.map(r => r.sku).filter(Boolean) as string[]
  let duplicateSkus: string[] = []
  if (skusToCheck.length > 0) {
    const { data: existing } = await admin
      .from('inventory_item')
      .select('sku')
      .eq('tenant_id', tenantId)
      .in('sku', skusToCheck)
      .is('deleted_at', null)
    duplicateSkus = (existing ?? []).map(r => r.sku!).filter(Boolean)
  }

  if (duplicateSkus.length > 0) {
    redirect(`/inventory/import?error=dup_sku&skus=${encodeURIComponent(duplicateSkus.join(','))}`)
  }

  // Insert items in batch
  const insertData = rows.map(r => ({
    tenant_id: tenantId,
    name: r.name,
    sku: r.sku || null,
    internal_code: r.internal_code || null,
    type: r.type || 'part',
    unit_of_measure: r.unit_of_measure || 'und',
    unit_id: r.unit_id || null,
    sale_price: r.sale_price,
    cost_price: r.cost_price,
    min_stock: r.min_stock ?? 0,
    description: r.description || null,
    is_active: true,
  }))

  const { data: inserted, error } = await admin
    .from('inventory_item')
    .insert(insertData)
    .select('id, initial_stock:min_stock') // reuse select to get ids

  if (error || !inserted) {
    redirect(`/inventory/import?error=${encodeURIComponent(error?.message ?? 'insert_failed')}`)
  }

  // For rows with initial_stock, create movement + stock records
  const rowsWithStock = rows.map((r, i) => ({ ...r, id: inserted[i]?.id }))
    .filter(r => r.id && r.initial_stock > 0)

  if (rowsWithStock.length > 0) {
    const locationId = await getOrCreateDefaultLocation(tenantId, profile.branch_id ?? null)

    const movements = rowsWithStock.map(r => ({
      tenant_id: tenantId,
      item_id: r.id,
      location_id: locationId,
      movement_type: 'purchase',
      quantity: r.initial_stock,
      unit_cost: r.cost_price,
      notes: 'Stock inicial (importación CSV)',
      status: 'completed',
      forced: false,
    }))

    const stockRecords = rowsWithStock.map(r => ({
      tenant_id: tenantId,
      item_id: r.id,
      location_id: locationId,
      quantity_on_hand: r.initial_stock,
      quantity_reserved: 0,
      bin_location: r.bin_location || null,
    }))

    await Promise.all([
      admin.from('inventory_movement').insert(movements),
      admin.from('inventory_stock').upsert(stockRecords, { onConflict: 'item_id,location_id' }),
    ])
  }

  redirect(`/inventory?imported=${rows.length}`)
}
