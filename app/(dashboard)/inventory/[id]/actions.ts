'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return createAdminClient()
}

export async function addCompatibility(formData: FormData) {
  const admin = await getAdmin()
  const itemId   = formData.get('item_id') as string
  const brand    = (formData.get('brand') as string).trim()
  const model    = (formData.get('model') as string)?.trim() || null
  const yearFrom = formData.get('year_from') ? Number(formData.get('year_from')) : null
  const yearTo   = formData.get('year_to')   ? Number(formData.get('year_to'))   : null
  const notes    = (formData.get('notes') as string)?.trim() || null

  if (!brand) return

  await admin.from('inventory_item_compatibility').insert({
    item_id: itemId, brand, model, year_from: yearFrom, year_to: yearTo, notes,
  })

  revalidatePath(`/inventory/${itemId}`)
}

export async function removeCompatibility(compatId: string, itemId: string) {
  const admin = await getAdmin()
  await admin.from('inventory_item_compatibility').delete().eq('id', compatId)
  revalidatePath(`/inventory/${itemId}`)
}

export async function updateItem(formData: FormData) {
  const admin = await getAdmin()
  const itemId      = formData.get('item_id') as string
  const name        = (formData.get('name') as string).trim()
  const sku         = (formData.get('sku') as string)?.trim() || null
  const internalCode = (formData.get('internal_code') as string)?.trim() || null
  const barcode     = (formData.get('barcode') as string)?.trim() || null
  const salePrice   = formData.get('sale_price') ? Number(formData.get('sale_price')) : null
  const costPrice   = formData.get('cost_price') ? Number(formData.get('cost_price')) : null
  const minStock    = formData.get('min_stock') ? Number(formData.get('min_stock')) : 0
  const description = (formData.get('description') as string)?.trim() || null

  await admin.from('inventory_item').update({
    name, sku, internal_code: internalCode, barcode, sale_price: salePrice,
    cost_price: costPrice, min_stock: minStock, description,
  }).eq('id', itemId)

  revalidatePath(`/inventory/${itemId}`)
  revalidatePath('/inventory')
}
