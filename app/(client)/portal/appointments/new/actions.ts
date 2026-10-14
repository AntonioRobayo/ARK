'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface CustomerRow {
  id: string
  tenant_id: string
}

export async function bookAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/portal/auth')
  }

  const adminClient = createAdminClient()

  const { data: customers } = await adminClient
    .from('customer')
    .select('id, tenant_id')
    .eq('email', user.email)
    .is('deleted_at', null)

  const customerList = (customers ?? []) as CustomerRow[]

  if (customerList.length === 0) {
    redirect('/portal/appointments/new?error=' + encodeURIComponent('No se encontró tu ficha de cliente.'))
  }

  const customer = customerList[0]

  const vehicleId = (formData.get('vehicle_id') as string)?.trim() || null
  const scheduledAt = formData.get('scheduled_at') as string
  const serviceReason = (formData.get('service_reason') as string)?.trim() ?? ''
  const extraNotes = (formData.get('notes') as string)?.trim() ?? ''

  const notes = extraNotes
    ? `${serviceReason} — ${extraNotes}`
    : serviceReason || null

  const { error } = await adminClient.from('appointment').insert({
    tenant_id: customer.tenant_id,
    customer_id: customer.id,
    vehicle_id: vehicleId,
    scheduled_at: scheduledAt,
    duration_minutes: 60,
    status: 'scheduled',
    notes,
    source: 'online',
  })

  if (error) {
    redirect(
      '/portal/appointments/new?error=' + encodeURIComponent(error.message),
    )
  }

  revalidatePath('/portal/appointments')
  redirect('/portal/appointments?booked=1')
}
