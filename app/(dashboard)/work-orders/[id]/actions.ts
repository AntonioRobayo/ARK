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

  // Email de cierre al cliente
  if (toStatus === 'closed' || toStatus === 'delivered_with_balance') {
    void (async () => {
      try {
        const { data: fullOt } = await adminClient
          .from('work_order')
          .select(`
            number, tenant_id,
            customer:customer_id(first_name, last_name, email),
            vehicle:vehicle_id(plate, brand, model, year)
          `)
          .eq('id', otId).single()
        if (!fullOt) return
        const customer = Array.isArray(fullOt.customer) ? fullOt.customer[0] : fullOt.customer
        const vehicle  = Array.isArray(fullOt.vehicle)  ? fullOt.vehicle[0]  : fullOt.vehicle
        if (!customer?.email) return

        const [{ data: tenant }, { data: quotation }, { data: customerParts }, { data: photos }, { data: invoice }] =
          await Promise.all([
            adminClient.from('tenants').select('name, settings').eq('id', fullOt.tenant_id).single(),
            adminClient.from('quotation').select('quotation_item(description, quantity, unit_price, subtotal)').eq('work_order_id', otId).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).maybeSingle(),
            adminClient.from('work_order_customer_part').select('description, quantity, condition, notes').eq('work_order_id', otId),
            adminClient.from('work_order_drive_attachment').select('drive_thumb_url, original_name').eq('work_order_id', otId).in('section', ['trabajo', 'entrega']).limit(6),
            adminClient.from('invoice').select('total, paid_amount').eq('work_order_id', otId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          ])

        const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>
        const { sendOtClosedEmail } = await import('@/lib/email')
        await sendOtClosedEmail({
          to: customer.email,
          customerName: `${customer.first_name} ${customer.last_name}`,
          workshopName: tenant?.name ?? 'ARK Workshop',
          workshopLogoUrl: tenantSettings.logo_url,
          otNumber: String(fullOt.number),
          vehiclePlate: vehicle?.plate ?? '',
          vehicleLabel: [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(' '),
          services: (quotation?.quotation_item ?? []).map((i: any) => ({
            description: i.description, quantity: i.quantity,
            unitPrice: i.unit_price, subtotal: i.subtotal,
          })),
          customerParts: (customerParts ?? []).map(p => ({
            description: p.description, quantity: p.quantity,
            condition: p.condition, notes: p.notes,
          })),
          photos: (photos ?? []).map(p => ({ thumbUrl: p.drive_thumb_url, name: p.original_name })),
          totalAmount:  invoice?.total ?? 0,
          paidAmount:   invoice?.paid_amount ?? 0,
        })
      } catch { /* email failure should not block status change */ }
    })()
  }

  redirect(`/work-orders/${otId}`)
}

// ─── Repuestos del cliente ────────────────────────────────────────────────────

export async function addCustomerPart(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const otId       = formData.get('ot_id') as string
  const tenantId   = formData.get('tenant_id') as string
  const description = (formData.get('description') as string)?.trim()
  const quantity    = parseInt(formData.get('quantity') as string) || 1
  const condition   = (formData.get('condition') as string) || 'new'
  const notes       = (formData.get('notes') as string)?.trim() || null

  if (!description || !otId || !tenantId) redirect(`/work-orders/${otId ?? ''}?error=part_empty`)

  await admin.from('work_order_customer_part').insert({
    work_order_id: otId,
    tenant_id:     tenantId,
    description,
    quantity,
    condition,
    notes,
    created_by: user.id,
  })

  // Audit log is non-critical — don't block the response
  void admin.from('tenant_audit_log').insert({
    tenant_id: tenantId,
    event:     'customer_part.added',
    actor_id:  user.id,
    details:   { work_order_id: otId, description, quantity, condition },
  })

  revalidatePath(`/work-orders/${otId}`)
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

export async function notifyReception(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const otId = formData.get('ot_id') as string
  const admin = createAdminClient()

  const { data: ot } = await admin
    .from('work_order')
    .select(`
      id, number, reception_notes, estimated_delivery_at, tenant_id,
      customer:customer_id(first_name, last_name, email),
      vehicle:vehicle_id(id, plate, brand, model, year),
      technician:technician_id(first_name, last_name)
    `)
    .eq('id', otId)
    .single()

  if (!ot) redirect('/work-orders')

  const customer = Array.isArray(ot.customer) ? ot.customer[0] : ot.customer as any
  if (!customer?.email) redirect(`/work-orders/${otId}?error=no_customer_email`)

  const vehicle    = Array.isArray(ot.vehicle)    ? ot.vehicle[0]    : ot.vehicle    as any
  const technician = Array.isArray(ot.technician) ? ot.technician[0] : ot.technician as any

  const [{ data: tenant }, { data: custodyRows }, { data: photos }, { data: customerParts }] = await Promise.all([
    admin.from('tenants').select('name, settings').eq('id', ot.tenant_id).single(),
    admin.from('custody_item').select('description, location').eq('work_order_id', otId),
    admin.from('work_order_drive_attachment').select('drive_thumb_url, original_name').eq('work_order_id', otId).eq('section', 'recepcion'),
    admin.from('work_order_customer_part').select('description, quantity, condition, notes').eq('work_order_id', otId),
  ])

  const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>

  const { sendOtOpenedEmail } = await import('@/lib/email')
  await sendOtOpenedEmail({
    to: customer.email,
    customerName: `${customer.first_name} ${customer.last_name}`,
    workshopName: tenant?.name ?? 'ARK Workshop',
    workshopLogoUrl: tenantSettings.logo_url,
    otNumber: String(ot.number),
    vehiclePlate: vehicle?.plate ?? '',
    vehicleLabel: [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(' '),
    receptionNotes: ot.reception_notes,
    estimatedDelivery: ot.estimated_delivery_at,
    technicianName: technician ? `${technician.first_name} ${technician.last_name ?? ''}` : null,
    photos: (photos ?? []).map((p: any) => ({ thumbUrl: p.drive_thumb_url, name: p.original_name })),
    customerParts: (customerParts ?? []).map((p: any) => ({ description: p.description, quantity: p.quantity, condition: p.condition, notes: p.notes })),
    custodyItems: (custodyRows ?? []).map((c: any) => ({ description: c.description, location: c.location })),
  })

  await admin.from('work_order').update({ reception_notified_at: new Date().toISOString() }).eq('id', otId)

  revalidatePath(`/work-orders/${otId}`)
  redirect(`/work-orders/${otId}?reception_notified=1`)
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

  const [{ error: updateError }, { data: tenant }] = await Promise.all([
    admin.from('work_order_finding')
      .update({ status: 'notified', notified_at: new Date().toISOString(), response_token: token })
      .in('id', findings.map(f => f.id)),
    admin.from('tenants').select('name, settings').eq('id', ot.tenant_id).single(),
  ])

  if (updateError) {
    redirect(`/work-orders/${otId}?error=` + encodeURIComponent(updateError.message))
  }

  const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>

  const { sendFindingNotificationEmail } = await import('@/lib/email')
  await sendFindingNotificationEmail({
    to: customer.email,
    customerName: `${customer.first_name} ${customer.last_name}`,
    workshopName: tenant?.name ?? 'ARK Workshop',
    workshopLogoUrl: tenantSettings.logo_url,
    otNumber: String(ot.number),
    vehiclePlate: vehicle?.plate ?? '',
    findings: findings.map(f => ({ description: f.description, severity: f.severity as 'minor' | 'moderate' | 'critical' })),
    respondUrl: `${base}/findings/respond/${token}`,
  })

  await admin.from('tenant_audit_log').insert({
    tenant_id: ot.tenant_id,
    event: 'finding.notified',
    actor_id: user.id,
    details: { work_order_id: otId, count: findings.length, token },
  })

  redirect(`/work-orders/${otId}?notified=1`)
}
