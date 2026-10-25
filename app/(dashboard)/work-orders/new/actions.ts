'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createWorkOrder(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('tenant_id, branch_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    redirect('/work-orders/new?error=' + encodeURIComponent('Tu perfil no tiene taller configurado'))
  }

  // branch_id: from form (multi-branch) → profile → first branch of tenant
  let branchId = (formData.get('branch_id') as string) || profile.branch_id
  if (!branchId) {
    const { data: branch } = await adminClient
      .from('branch')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .limit(1)
      .single()
    branchId = branch?.id ?? null
  }

  if (!branchId) {
    redirect('/work-orders/new?error=' + encodeURIComponent('No hay una sede configurada para este taller'))
  }

  // Generar número de OT
  const { data: nextNum, error: numError } = await adminClient
    .rpc('next_document_number', { p_tenant_id: profile.tenant_id, p_doc_type: 'OT' })

  if (numError || !nextNum) {
    redirect('/work-orders/new?error=' + encodeURIComponent('Error al generar número de OT: ' + numError?.message))
  }

  const receptionMileage = formData.get('reception_mileage')
  const fuelLevel        = formData.get('fuel_level')
  const technicianId     = formData.get('technician_id') as string
  const estimatedAt      = formData.get('estimated_delivery_at') as string
  const appointmentId    = (formData.get('appointment_id') as string) || null

  const vehicleId = formData.get('vehicle_id') as string

  const { data: ot, error } = await adminClient
    .from('work_order')
    .insert({
      tenant_id:             profile.tenant_id,
      branch_id:             branchId,
      number:                String(nextNum),
      customer_id:           formData.get('customer_id') as string,
      vehicle_id:            vehicleId,
      appointment_id:        appointmentId,
      status:                'received',
      priority:              (formData.get('priority') as string) || 'normal',
      reception_mileage:     receptionMileage ? Number(receptionMileage) : null,
      fuel_level:            (fuelLevel as string) || null,
      reception_notes:       (formData.get('reception_notes') as string) || null,
      technician_id:         technicianId || null,
      estimated_delivery_at: estimatedAt || null,
      created_by:            user.id,
    })
    .select('id')
    .single()

  if (error || !ot) {
    redirect('/work-orders/new?error=' + encodeURIComponent(error?.message ?? 'Error al crear la OT'))
  }

  // Actualizar kilometraje del vehículo si el de recepción es mayor
  if (receptionMileage) {
    const km = Number(receptionMileage)
    if (!isNaN(km) && km > 0) {
      await adminClient
        .from('vehicle')
        .update({ current_mileage: km })
        .eq('id', vehicleId)
        .or(`current_mileage.is.null,current_mileage.lt.${km}`)
    }
  }

  // Registrar en log de estados
  await adminClient.from('work_order_status_log').insert({
    work_order_id: ot.id,
    from_status:   null,
    to_status:     'received',
    changed_by:    user.id,
    reason:        'Creación de orden',
  })

  // Marcar cita como atendida
  if (appointmentId) {
    await adminClient.from('appointment').update({ status: 'arrived' }).eq('id', appointmentId)
  }

  // Insertar objetos en custodia
  const custodyRaw = formData.get('custody_items') as string
  if (custodyRaw) {
    const custodyItems: { description: string; location: string }[] = JSON.parse(custodyRaw)
    if (custodyItems.length > 0) {
      await adminClient.from('custody_item').insert(
        custodyItems.map(item => ({
          tenant_id:     profile.tenant_id,
          work_order_id: ot.id,
          description:   item.description,
          location:      item.location || null,
          received_by:   user.id,
        }))
      )
    }
  }

  // Insertar repuestos del cliente
  const partsRaw = formData.get('customer_parts_data') as string
  if (partsRaw) {
    const parts: { description: string; quantity: number; condition: string; notes: string }[] = JSON.parse(partsRaw)
    if (parts.length > 0) {
      await adminClient.from('work_order_customer_part').insert(
        parts.map(p => ({
          tenant_id:     profile.tenant_id,
          work_order_id: ot.id,
          description:   p.description,
          quantity:      p.quantity,
          condition:     p.condition,
          notes:         p.notes || null,
          created_by:    user.id,
        }))
      )
    }
  }

  // Insertar checklist de recepción
  const checklistRaw = formData.get('checklist_data') as string
  if (checklistRaw) {
    const checklistData: { templateId: string; responses: Record<string, string> } | null = JSON.parse(checklistRaw)
    if (checklistData?.templateId) {
      const { data: woc } = await adminClient.from('work_order_checklist').insert({
        tenant_id:            profile.tenant_id,
        work_order_id:        ot.id,
        checklist_template_id: checklistData.templateId,
        stage:                'reception',
        completed_by:         user.id,
        completed_at:         new Date().toISOString(),
      }).select('id').single()

      if (woc) {
        const itemInserts = Object.entries(checklistData.responses).map(([templateItemId, status]) => ({
          checklist_id:    woc.id,
          template_item_id: templateItemId,
          status,
        }))
        if (itemInserts.length > 0) {
          await adminClient.from('work_order_checklist_item').insert(itemInserts)
        }
      }
    }
  }

  // Audit log
  await adminClient.from('tenant_audit_log').insert({
    tenant_id: profile.tenant_id,
    event: 'work_order.created',
    actor_id: user.id,
    details: { work_order_id: ot.id, number: String(nextNum) },
  })

  // Email automático de recepción al cliente
  void (async () => {
    try {
      const { data: fullOt } = await adminClient
        .from('work_order')
        .select(`
          number, reception_notes, estimated_delivery_at, tenant_id,
          customer:customer_id(first_name, last_name, email),
          vehicle:vehicle_id(plate, brand, model, year),
          technician:technician_id(first_name, last_name)
        `)
        .eq('id', ot.id).single()
      if (!fullOt) return
      const customer   = Array.isArray(fullOt.customer)   ? fullOt.customer[0]   : fullOt.customer as any
      const vehicle    = Array.isArray(fullOt.vehicle)    ? fullOt.vehicle[0]    : fullOt.vehicle    as any
      const technician = Array.isArray(fullOt.technician) ? fullOt.technician[0] : fullOt.technician as any
      if (!customer?.email) return

      const [{ data: tenant }, { data: custodyRows }, { data: insertedParts }] = await Promise.all([
        adminClient.from('tenants').select('name, settings').eq('id', fullOt.tenant_id).single(),
        adminClient.from('custody_item').select('description, location').eq('work_order_id', ot.id),
        adminClient.from('work_order_customer_part').select('description, quantity, condition, notes').eq('work_order_id', ot.id),
      ])

      const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>
      const { sendOtOpenedEmail } = await import('@/lib/email')
      await sendOtOpenedEmail({
        to:           customer.email,
        customerName: `${customer.first_name} ${customer.last_name ?? ''}`.trim(),
        workshopName: tenant?.name ?? 'ARK Workshop',
        workshopLogoUrl: tenantSettings.logo_url,
        otNumber:     String(fullOt.number),
        vehiclePlate: vehicle?.plate ?? '',
        vehicleLabel: [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(' '),
        receptionNotes:   fullOt.reception_notes,
        estimatedDelivery: fullOt.estimated_delivery_at,
        technicianName: technician ? `${technician.first_name} ${technician.last_name ?? ''}`.trim() : null,
        photos:       [],
        customerParts: (insertedParts ?? []).map((p: any) => ({ description: p.description, quantity: p.quantity, condition: p.condition, notes: p.notes })),
        custodyItems:  (custodyRows  ?? []).map((c: any) => ({ description: c.description, location: c.location })),
      })

      await adminClient.from('work_order').update({ reception_notified_at: new Date().toISOString() }).eq('id', ot.id)
    } catch { /* email failure should not block OT creation */ }
  })()

  redirect(`/work-orders/${ot.id}?reception=new`)
}
