'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const { data: item, error } = await supabase.from('inventory_item').insert({
    tenant_id: profile.tenant_id,
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    type: (formData.get('type') as string) || 'part',
    internal_code: (formData.get('internal_code') as string)?.trim() || null,
    barcode: (formData.get('barcode') as string)?.trim() || null,
    unit_of_measure: (formData.get('unit_of_measure') as string)?.trim() || 'und',
    sale_price: Number(formData.get('sale_price') ?? 0),
    cost_price: Number(formData.get('cost_price') ?? 0),
    min_stock: formData.get('min_stock') ? Number(formData.get('min_stock')) : null,
    is_active: true,
  }).select('id').single()

  if (error || !item) {
    redirect('/inventory/new?error=' + encodeURIComponent(error?.message ?? 'Error al crear ítem'))
  }

  redirect(`/inventory/${item.id}`)
}
