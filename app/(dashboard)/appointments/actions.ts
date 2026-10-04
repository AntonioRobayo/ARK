'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id, branch_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const scheduledAt = formData.get('scheduled_at') as string
  const customerId = formData.get('customer_id') as string
  const vehicleId = (formData.get('vehicle_id') as string) || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const durationMinutes = Number(formData.get('duration_minutes') ?? 60)

  const { error } = await supabase.from('appointment').insert({
    tenant_id: profile.tenant_id,
    branch_id: profile.branch_id || null,
    customer_id: customerId,
    vehicle_id: vehicleId,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    status: 'scheduled',
    notes,
    source: 'manual',
  })

  if (error) {
    redirect('/appointments/new?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/appointments')
  redirect('/appointments')
}

export async function updateAppointmentStatus(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const status = formData.get('status') as string

  await supabase.from('appointment').update({ status }).eq('id', id)
  revalidatePath('/appointments')
  redirect('/appointments')
}

export async function convertToWorkOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id, branch_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const appointmentId = formData.get('appointment_id') as string

  const { data: appt } = await supabase
    .from('appointment')
    .select('customer_id, vehicle_id')
    .eq('id', appointmentId).single()

  if (!appt) redirect('/appointments')

  redirect(`/work-orders/new?customer_id=${appt.customer_id}&vehicle_id=${appt.vehicle_id ?? ''}&appointment_id=${appointmentId}`)
}
