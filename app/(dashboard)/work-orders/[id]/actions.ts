'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { STATUS_TRANSITIONS } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export async function changeStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const otId    = formData.get('ot_id') as string
  const toStatus = formData.get('to_status') as WorkOrderStatus
  const reason  = (formData.get('reason') as string) || null

  // Verificar que la transición es válida
  const { data: ot } = await adminClient
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

  const { error } = await adminClient
    .from('work_order')
    .update(updateData)
    .eq('id', otId)

  if (error) {
    redirect(`/work-orders/${otId}?error=` + encodeURIComponent(error.message))
  }

  // Log del cambio
  await adminClient.from('work_order_status_log').insert({
    work_order_id: otId,
    from_status:   ot.status,
    to_status:     toStatus,
    changed_by:    user.id,
    reason,
  })

  redirect(`/work-orders/${otId}`)
}

// ─── Hallazgos de diagnóstico ─────────────────────────────────────────────────

export async function addFinding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const otId = formData.get('ot_id') as string
  const description = (formData.get('description') as string)?.trim()
  const severity = (formData.get('severity') as string) || 'moderate'

  if (!description || !otId) redirect(`/work-orders/${otId}?error=finding_empty`)

  const { data: ot } = await admin.from('work_order').select('tenant_id').eq('id', otId).single()
  if (!ot) redirect('/work-orders')

  await admin.from('work_order_finding').insert({
    work_order_id: otId,
    tenant_id: ot.tenant_id,
    description,
    severity,
    created_by: user.id,
  })

  await admin.from('tenant_audit_log').insert({
    tenant_id: ot.tenant_id,
    event: 'finding.added',
    actor_id: user.id,
    details: { work_order_id: otId, description, severity },
  })

  revalidatePath(`/work-orders/${otId}`)
}

export async function notifyCustomerFindings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const otId = formData.get('ot_id') as string
  const admin = createAdminClient()

  const { data: ot } = await admin
    .from('work_order')
    .select('tenant_id, number, customer:customer_id(first_name, last_name, email), vehicle:vehicle_id(plate)')
    .eq('id', otId)
    .single()

  if (!ot) redirect('/work-orders')

  const customer = Array.isArray(ot.customer) ? ot.customer[0] : ot.customer
  const vehicle  = Array.isArray(ot.vehicle)  ? ot.vehicle[0]  : ot.vehicle

  if (!customer?.email) redirect(`/work-orders/${otId}?error=no_customer_email`)

  // Get pending findings
  const { data: findings } = await admin
    .from('work_order_finding')
    .select('id, description, severity')
    .eq('work_order_id', otId)
    .eq('status', 'pending')

  if (!findings || findings.length === 0) redirect(`/work-orders/${otId}?error=no_pending_findings`)

  // Generate one shared response token for this notification batch
  const token = crypto.randomUUID()
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  await admin
    .from('work_order_finding')
    .update({ status: 'notified', notified_at: new Date().toISOString(), response_token: token })
    .in('id', findings.map(f => f.id))

  const { sendFindingNotificationEmail } = await import('@/lib/email')
  await sendFindingNotificationEmail({
    to: customer.email,
    customerName: `${customer.first_name} ${customer.last_name}`,
    workshopName: '',
    otNumber: String(ot.number),
    vehiclePlate: vehicle?.plate ?? '',
    findings: findings.map(f => ({ description: f.description, severity: f.severity as 'minor' | 'moderate' | 'critical' })),
    approveUrl: `${base}/api/findings/respond?token=${token}&action=approve_quote`,
    noteUrl:    `${base}/api/findings/respond?token=${token}&action=note_only`,
  })

  await admin.from('tenant_audit_log').insert({
    tenant_id: ot.tenant_id,
    event: 'finding.notified',
    actor_id: user.id,
    details: { work_order_id: otId, count: findings.length, token },
  })

  redirect(`/work-orders/${otId}?notified=1`)
}
