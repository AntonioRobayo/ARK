'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function updateVehicle(vehicleId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('tenant_id, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id && !profile?.is_platform_admin) {
    redirect(`/vehicles/${vehicleId}?error=` + encodeURIComponent('Sin permisos'))
  }

  // Verify vehicle belongs to this tenant (via customer) unless superadmin
  if (!profile.is_platform_admin) {
    const { data: v } = await adminClient
      .from('vehicle')
      .select('id, customer:customer_id(tenant_id)')
      .eq('id', vehicleId)
      .single()

    const customerTenant = (v?.customer as any)?.tenant_id
    if (customerTenant && customerTenant !== profile.tenant_id) {
      redirect(`/vehicles/${vehicleId}?error=` + encodeURIComponent('Sin acceso a este vehículo'))
    }
  }

  const plate     = (formData.get('plate') as string)?.trim().toUpperCase() || null
  const brand     = (formData.get('brand') as string)?.trim() || null
  const model     = (formData.get('model') as string)?.trim() || null
  const year      = formData.get('year') ? Number(formData.get('year')) : null
  const color     = (formData.get('color') as string)?.trim() || null
  const engineCC  = formData.get('engine_cc') ? Number(formData.get('engine_cc')) : null
  const fuelType  = (formData.get('fuel_type') as string)?.trim() || null
  const vin       = (formData.get('vin') as string)?.trim().toUpperCase() || null
  const notes     = (formData.get('notes') as string)?.trim() || null
  const newKm     = formData.get('current_mileage') ? Number(formData.get('current_mileage')) : null

  // Fetch current mileage to enforce the "only update if greater" rule
  const { data: current } = await adminClient
    .from('vehicle')
    .select('current_mileage')
    .eq('id', vehicleId)
    .single()

  const shouldUpdateKm = newKm !== null && !isNaN(newKm) && newKm > 0 &&
    (current?.current_mileage === null || current?.current_mileage === undefined || newKm > current.current_mileage)

  const { error } = await adminClient
    .from('vehicle')
    .update({
      plate,
      brand,
      model,
      year,
      color,
      engine_cc: engineCC,
      fuel_type: fuelType,
      vin,
      notes,
      ...(shouldUpdateKm ? { current_mileage: newKm } : {}),
    })
    .eq('id', vehicleId)

  if (error) {
    redirect(`/vehicles/${vehicleId}/edit?error=` + encodeURIComponent(error.message))
  }

  // Audit log
  if (profile.tenant_id) {
    await adminClient.from('tenant_audit_log').insert({
      tenant_id: profile.tenant_id,
      event: 'vehicle.updated',
      actor_id: user.id,
      details: {
        vehicle_id: vehicleId,
        fields: { plate, brand, model, year, color, engine_cc: engineCC, fuel_type: fuelType, vin, notes,
          ...(shouldUpdateKm ? { current_mileage: newKm } : {}) },
      },
    })
  }

  redirect(`/vehicles/${vehicleId}`)
}
