'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkOrder(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id, branch_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id || !profile?.branch_id) {
    redirect('/work-orders/new?error=' + encodeURIComponent('Tu perfil no tiene taller o sede configurada'))
  }

  // Generar número de OT
  const { data: nextNum, error: numError } = await supabase
    .rpc('next_document_number', { p_tenant_id: profile.tenant_id, p_doc_type: 'OT' })

  if (numError || !nextNum) {
    redirect('/work-orders/new?error=' + encodeURIComponent('Error al generar número de OT: ' + numError?.message))
  }

  const receptionMileage = formData.get('reception_mileage')
  const fuelLevel        = formData.get('fuel_level')
  const batteryLevel     = formData.get('battery_level')
  const technicianId     = formData.get('technician_id') as string
  const estimatedAt      = formData.get('estimated_delivery_at') as string

  const { data: ot, error } = await supabase
    .from('work_order')
    .insert({
      tenant_id:             profile.tenant_id,
      branch_id:             profile.branch_id,
      number:                String(nextNum),
      customer_id:           formData.get('customer_id') as string,
      vehicle_id:            formData.get('vehicle_id') as string,
      status:                'received',
      priority:              (formData.get('priority') as string) || 'normal',
      reception_mileage:     receptionMileage ? Number(receptionMileage) : null,
      fuel_level:            fuelLevel ? Number(fuelLevel) : null,
      battery_level:         batteryLevel ? Number(batteryLevel) : null,
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

  // Registrar en log de estados
  await supabase.from('work_order_status_log').insert({
    work_order_id: ot.id,
    from_status:   null,
    to_status:     'received',
    changed_by:    user.id,
    reason:        'Creación de orden',
  })

  redirect(`/work-orders/${ot.id}`)
}
