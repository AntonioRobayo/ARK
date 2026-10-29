'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateDefaultLocation } from '@/app/(dashboard)/inventory/actions'

export async function consumePart(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const workOrderId = formData.get('work_order_id') as string
  const itemId      = formData.get('item_id') as string
  const quantity    = Number(formData.get('quantity') ?? 1)
  const forced      = formData.get('forced') === '1'
  const notes       = (formData.get('notes') as string)?.trim() || null

  const { data: profile } = await admin
    .from('user_profile').select('tenant_id, branch_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const locationId = await getOrCreateDefaultLocation(profile.tenant_id, profile.branch_id ?? null)

  const { data: stockRow } = await admin
    .from('inventory_stock')
    .select('quantity_on_hand, quantity_reserved')
    .eq('item_id', itemId)
    .eq('location_id', locationId)
    .single()

  const available = (stockRow?.quantity_on_hand ?? 0) - (stockRow?.quantity_reserved ?? 0)

  if (available < quantity && !forced) {
    redirect(`/work-orders/${workOrderId}/parts?error=insufficient_stock&item_id=${itemId}`)
  }

  await admin.from('inventory_movement').insert({
    tenant_id: profile.tenant_id,
    item_id: itemId,
    location_id: locationId,
    movement_type: 'consumption',
    quantity: -Math.abs(quantity),
    performed_by: user.id,
    notes: notes ?? `Consumido en OT`,
    forced,
  })

  const newQty = Math.max(0, (stockRow?.quantity_on_hand ?? 0) - quantity)
  await admin.from('inventory_stock').upsert({
    tenant_id: profile.tenant_id,
    item_id: itemId,
    location_id: locationId,
    quantity_on_hand: newQty,
    quantity_reserved: Math.max(0, stockRow?.quantity_reserved ?? 0),
  }, { onConflict: 'item_id,location_id' })

  revalidatePath(`/work-orders/${workOrderId}/parts`)
}
