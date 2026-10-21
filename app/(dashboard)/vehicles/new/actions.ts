'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ensureCatalogValue } from '@/lib/catalog'

export async function createVehicle(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    redirect('/vehicles/new?error=' + encodeURIComponent('Sin tenant configurado'))
  }

  const customerId = (formData.get('customer_id') as string) ||
                     (formData.get('customer_id_manual') as string) || null

  const plate        = (formData.get('plate') as string)?.trim().toUpperCase() || null
  const year         = formData.get('year') ? Number(formData.get('year')) : null
  const cc           = formData.get('engine_cc') ? Number(formData.get('engine_cc')) : null
  const km           = formData.get('current_mileage') ? Number(formData.get('current_mileage')) : null
  const brand        = (formData.get('brand') as string)?.trim() || ''
  const vehicleType  = (formData.get('vehicle_type') as string) || 'motorcycle'
  const fuelType     = (formData.get('fuel_type') as string)?.trim() || null
  const vin          = (formData.get('vin') as string)?.trim().toUpperCase() || null

  const { data: vehicle, error } = await adminClient
    .from('vehicle')
    .insert({
      tenant_id:       profile.tenant_id,
      customer_id:     customerId || null,
      plate,
      brand,
      model:           (formData.get('model') as string).trim(),
      year,
      color:           (formData.get('color') as string)?.trim() || null,
      engine_cc:       cc,
      vehicle_type:    vehicleType,
      current_mileage: km,
      fuel_type:       fuelType,
      vin,
      notes:           (formData.get('notes') as string)?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !vehicle) {
    redirect('/vehicles/new?error=' + encodeURIComponent(error?.message ?? 'Error al registrar vehículo'))
  }

  // Auto-add new values to global catalog so they appear as suggestions next time
  await Promise.allSettled([
    ensureCatalogValue('vehicle_brand', brand, brand),
    ensureCatalogValue('vehicle_type', vehicleType, vehicleType),
    fuelType ? ensureCatalogValue('fuel_type', fuelType, fuelType) : Promise.resolve(),
  ])

  const redirectTo = formData.get('redirect_to') as string
  if (redirectTo) redirect(redirectTo)
  if (customerId) redirect(`/customers/${customerId}`)
  redirect(`/vehicles/${vehicle.id}`)
}
