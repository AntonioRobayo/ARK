'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function logEvent(tenantId: string, event: string, details?: object) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminClient = createAdminClient()
    await adminClient.from('tenant_audit_log').insert({
      tenant_id: tenantId,
      event,
      details: details ?? null,
      actor_id: user?.id ?? null,
    })
  } catch { /* non-blocking */ }
}

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
  await logEvent(id, 'plan_updated', { plan_id: planId, expires_at: expiresAt, contracted_users: contractedUsers })
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
  await logEvent(id, 'license_extended', { days, new_expiry: newExpiry })
  redirect(`/superadmin?success=${encodeURIComponent(`Licencia extendida +${days} días`)}`)
}

export async function resetUserPassword(formData: FormData) {
  const adminClient = createAdminClient()
  const email    = formData.get('email') as string
  const tenantId = formData.get('tenant_id') as string

  const { error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(error.message)}`)
  }
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent(`Email de restablecimiento enviado a ${email}`)}`)
}

export async function generateImpersonateLink(email: string): Promise<{ url?: string; error?: string }> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) return { error: error.message }
  return { url: data.properties?.action_link ?? '' }
}

export async function inviteAdmin(formData: FormData) {
  const adminClient = createAdminClient()
  const tenantId = formData.get('tenant_id') as string
  const email    = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !tenantId) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent('Email requerido')}`)
  }

  // If user already exists unconfirmed, delete so the invite can be resent
  const { data: existing } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing?.users.find(u => u.email === email)
  if (existingUser && !existingUser.confirmed_at) {
    await adminClient.auth.admin.deleteUser(existingUser.id)
  } else if (existingUser) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent('El usuario ya tiene cuenta activa')}`)
  }

  const onboardingNext = encodeURIComponent(`/onboarding?tenant_id=${tenantId}`)
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${onboardingNext}`,
    data: { tenant_id: tenantId, role: 'admin' },
  })

  if (inviteError) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(inviteError.message)}`)
  }
  await logEvent(tenantId, 'admin_invited', { email })
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent(`Invitación enviada a ${email}`)}`)
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
  await logEvent(id, 'status_changed', { is_active: !isActive })
  redirect('/superadmin')
}
