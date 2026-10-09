'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateTenant(id: string, formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const name               = formData.get('name') as string
  const planId             = formData.get('plan_id') as string
  const expiresAt          = (formData.get('plan_expires_at') as string) || null
  const countryCode        = (formData.get('country_code') as string) || 'CO'
  const currencyCode       = (formData.get('currency_code') as string) || 'COP'
  const timezone           = (formData.get('timezone') as string) || 'America/Bogota'
  const contractedUsers    = Number(formData.get('contracted_users') || 1)
  const contractedBranches = Number(formData.get('contracted_branches') || 1)

  const { data: planData } = await supabase
    .from('license_plan')
    .select('slug')
    .eq('id', planId)
    .single()

  const { error } = await adminClient
    .from('tenants')
    .update({
      name,
      plan_id: planId,
      plan: planData?.slug ?? undefined,
      plan_expires_at: expiresAt || null,
      country_code: countryCode,
      currency_code: currencyCode,
      timezone,
      contracted_users: contractedUsers,
      contracted_branches: contractedBranches,
    })
    .eq('id', id)

  if (error) {
    redirect(`/superadmin/tenants/${id}/edit?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin?success=Taller actualizado correctamente')
}

export async function extendLicense(formData: FormData) {
  const adminClient = createAdminClient()
  const id   = formData.get('id') as string
  const days = parseInt(formData.get('days') as string, 10)

  if (!id || isNaN(days) || days <= 0) {
    redirect(`/superadmin?error=Datos inválidos`)
  }

  // Fetch current expiry; if expired (or null), extend from today
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('plan_expires_at')
    .eq('id', id)
    .single()

  const base = tenant?.plan_expires_at && new Date(tenant.plan_expires_at) > new Date()
    ? new Date(tenant.plan_expires_at)
    : new Date()

  base.setDate(base.getDate() + days)
  const newExpiry = base.toISOString()

  const { error } = await adminClient
    .from('tenants')
    .update({ plan_expires_at: newExpiry, is_active: true })
    .eq('id', id)

  if (error) {
    redirect(`/superadmin?error=${encodeURIComponent(error.message)}`)
  }
  redirect(`/superadmin?success=${encodeURIComponent(`Licencia extendida +${days} días`)}`)
}

export async function toggleTenantStatus(formData: FormData) {
  const adminClient = createAdminClient()
  const id        = formData.get('id') as string
  const isActive  = formData.get('is_active') === 'true'

  const { error } = await adminClient
    .from('tenants')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) {
    redirect(`/superadmin?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin')
}
