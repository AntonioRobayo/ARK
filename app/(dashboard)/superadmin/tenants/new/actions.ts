'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createTenantAndInvite(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const workshopName  = formData.get('workshop_name') as string
  const planId        = formData.get('plan_id') as string
  const countryCode   = (formData.get('country_code') as string) || 'CO'
  const currencyCode  = (formData.get('currency_code') as string) || 'COP'
  const timezone      = (formData.get('timezone') as string) || 'America/Bogota'
  const adminEmail    = formData.get('admin_email') as string

  // Obtener el slug del plan seleccionado
  const { data: planData } = await supabase
    .from('license_plan')
    .select('slug')
    .eq('id', planId)
    .single()

  // 1. Crear el tenant en la BD
  const { data: tenantData, error: tenantError } = await supabase.rpc('superadmin_create_tenant', {
    p_tenant_name:   workshopName,
    p_tenant_slug:   toSlug(workshopName),
    p_plan:          planData?.slug ?? 'starter',
    p_country_code:  countryCode,
    p_currency_code: currencyCode,
    p_timezone:      timezone,
  })

  if (tenantError) {
    redirect(`/superadmin/tenants/new?error=${encodeURIComponent(tenantError.message)}`)
  }

  const tenantId = (tenantData as { tenant_id: string }).tenant_id

  // Actualizar plan_id (el RPC solo setea el slug)
  await adminClient.from('tenants').update({ plan_id: planId }).eq('id', tenantId)

  // 2. Invitar al admin por email usando service role
  // El link de invitación redirige a /onboarding?tenant_id=...
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(adminEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?tenant_id=${tenantId}`,
    data: { tenant_id: tenantId, role: 'admin' },
  })

  if (inviteError) {
    redirect(`/superadmin/tenants/new?error=${encodeURIComponent(inviteError.message)}`)
  }

  redirect(`/superadmin?success=Taller creado. Invitación enviada a ${adminEmail}`)
}
