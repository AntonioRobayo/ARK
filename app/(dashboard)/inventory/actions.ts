'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getTenantAndBranch() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profile')
    .select('tenant_id, branch_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) throw new Error('No tenant')
  return { admin, user, tenantId: profile.tenant_id, branchId: profile.branch_id }
}

export async function getOrCreateDefaultLocation(tenantId: string, branchId: string | null) {
  const admin = createAdminClient()

  // Try to find existing location for this tenant
  const { data: existing } = await admin
    .from('inventory_location')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (existing) return existing.id

  // Need a branch_id — get the main branch or first branch
  let bid = branchId
  if (!bid) {
    const { data: mainBranch } = await admin
      .from('branch')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_main', true)
      .single()
    bid = mainBranch?.id ?? null
  }
  if (!bid) {
    const { data: anyBranch } = await admin
      .from('branch')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .single()
    bid = anyBranch?.id ?? null
  }
  if (!bid) throw new Error('No branch found for tenant — cannot create inventory location')

  const { data: created } = await admin
    .from('inventory_location')
    .insert({ tenant_id: tenantId, branch_id: bid, name: 'Almacén principal', type: 'warehouse' })
    .select('id')
    .single()

  if (!created) throw new Error('Could not create default location')
  return created.id
}

export async function createItem(formData: FormData) {
  const { admin, tenantId, branchId } = await getTenantAndBranch()

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'part'
  const internalCode = (formData.get('internal_code') as string) || null
  const barcode = (formData.get('barcode') as string) || null
  const sku = (formData.get('sku') as string)?.trim() || null
  const salePrice = formData.get('sale_price') ? Number(formData.get('sale_price')) : null
  const costPrice = formData.get('cost_price') ? Number(formData.get('cost_price')) : null
  const minStock = formData.get('min_stock') ? Number(formData.get('min_stock')) : 0
  const description = (formData.get('description') as string) || null
  const initialStock = formData.get('initial_stock') ? Number(formData.get('initial_stock')) : 0
  const binLocation = (formData.get('bin_location') as string)?.trim() || null

  // unit_combo = "{unit_id}|{unit_key}" — from unit_catalog select
  const unitCombo = (formData.get('unit_combo') as string) || ''
  const unitText = (formData.get('unit_text') as string) || 'und'
  const [unitId, unitKey] = unitCombo.includes('|') ? unitCombo.split('|') : [null, null]
  const unitOfMeasure = unitKey || unitText

  // Fetch location in parallel with item insert when we'll need it
  const [{ data: item, error }, locationId] = await Promise.all([
    admin
      .from('inventory_item')
      .insert({
        tenant_id: tenantId,
        name,
        type,
        sku: sku || null,
        unit_of_measure: unitOfMeasure,
        unit_id: unitId || null,
        internal_code: internalCode || null,
        barcode: barcode || null,
        sale_price: salePrice,
        cost_price: costPrice,
        min_stock: minStock,
        description: description || null,
      })
      .select('id')
      .single(),
    initialStock > 0 ? getOrCreateDefaultLocation(tenantId, branchId) : Promise.resolve(null),
  ])

  if (error || !item) throw new Error(error?.message ?? 'Could not create item')

  // Create initial stock movement + stock record if initialStock > 0
  if (initialStock > 0 && locationId) {
    await Promise.all([
      admin.from('inventory_movement').insert({
        tenant_id: tenantId,
        item_id: item.id,
        location_id: locationId,
        movement_type: 'purchase',
        quantity: initialStock,
        unit_cost: costPrice,
        notes: 'Stock inicial',
      }),
      admin.from('inventory_stock').upsert({
        tenant_id: tenantId,
        item_id: item.id,
        location_id: locationId,
        quantity_on_hand: initialStock,
        quantity_reserved: 0,
        ...(binLocation ? { bin_location: binLocation } : {}),
      }, { onConflict: 'item_id,location_id' }),
    ])
  }

  revalidatePath('/inventory')
  redirect(`/inventory/${item.id}`)
}

export async function adjustStock(formData: FormData) {
  const { admin, user, tenantId, branchId } = await getTenantAndBranch()

  const itemId = formData.get('item_id') as string
  const movementType = formData.get('movement_type') as string
  const qty = Number(formData.get('quantity'))
  const unitCost = formData.get('unit_cost') ? Number(formData.get('unit_cost')) : null
  const notes = (formData.get('notes') as string) || null
  const supplierId = (formData.get('supplier_id') as string) || null
  const purchaseReference = (formData.get('purchase_reference') as string)?.trim() || null

  if (!itemId || !qty) return

  const delta = movementType === 'consumption' || movementType === 'write_off' ? -Math.abs(qty) : Math.abs(qty)

  const [locationId, { data: existing }] = await Promise.all([
    getOrCreateDefaultLocation(tenantId, branchId),
    admin
      .from('inventory_stock')
      .select('quantity_on_hand')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single(),
  ])

  const newQty = Math.max(0, (existing?.quantity_on_hand ?? 0) + delta)

  await Promise.all([
    admin.from('inventory_movement').insert({
      tenant_id: tenantId,
      item_id: itemId,
      location_id: locationId,
      movement_type: movementType,
      quantity: delta,
      unit_cost: unitCost,
      performed_by: user.id,
      notes,
      supplier_id: supplierId || null,
      purchase_reference: purchaseReference || null,
    }),
    admin.from('inventory_stock').upsert({
      tenant_id: tenantId,
      item_id: itemId,
      location_id: locationId,
      quantity_on_hand: newQty,
      quantity_reserved: 0,
    }, { onConflict: 'item_id,location_id' }),
  ])

  revalidatePath(`/inventory/${itemId}`)
}

export async function toggleItemActive(itemId: string, isActive: boolean) {
  const { admin } = await getTenantAndBranch()
  await admin.from('inventory_item').update({ is_active: !isActive }).eq('id', itemId)
  revalidatePath(`/inventory/${itemId}`)
  revalidatePath('/inventory')
}
