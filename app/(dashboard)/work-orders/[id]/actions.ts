'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { STATUS_TRANSITIONS } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export async function changeStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const otId    = formData.get('ot_id') as string
  const toStatus = formData.get('to_status') as WorkOrderStatus
  const reason  = (formData.get('reason') as string) || null

  // Verificar que la transición es válida
  const { data: ot } = await supabase
    .from('work_order')
    .select('status')
    .eq('id', otId)
    .single()

  if (!ot) redirect('/work-orders')

  const allowed = STATUS_TRANSITIONS[ot.status as WorkOrderStatus] ?? []
  if (!allowed.includes(toStatus)) {
    redirect(`/work-orders/${otId}?error=` + encodeURIComponent(`Transición no permitida: ${ot.status} → ${toStatus}`))
  }

  // Actualizar estado
  const updateData: Record<string, unknown> = { status: toStatus }
  if (toStatus === 'cancelled')              updateData.cancelled_at = new Date().toISOString()
  if (toStatus === 'closed')                 updateData.closed_at    = new Date().toISOString()
  if (toStatus === 'delivered_with_balance' || toStatus === 'closed') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('work_order')
    .update(updateData)
    .eq('id', otId)

  if (error) {
    redirect(`/work-orders/${otId}?error=` + encodeURIComponent(error.message))
  }

  // Log del cambio
  await supabase.from('work_order_status_log').insert({
    work_order_id: otId,
    from_status:   ot.status,
    to_status:     toStatus,
    changed_by:    user.id,
    reason,
  })

  redirect(`/work-orders/${otId}`)
}
