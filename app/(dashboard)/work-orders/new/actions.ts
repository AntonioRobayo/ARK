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

  let branchId = profile.branch_id
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

  redirect(`/work-orders/${ot.id}`)
}
