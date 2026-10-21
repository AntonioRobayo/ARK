'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendPasswordResetEmail } from '@/lib/email'

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

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/recovery`

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: callbackUrl },
  })

  if (error) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(error.message)}`)
  }

  const resetUrl = data?.properties?.action_link
  if (!resetUrl) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent('No se pudo generar el link de recuperación')}`)
  }

  try {
    await sendPasswordResetEmail({ to: email, resetUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al enviar email'
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(msg)}`)
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
  const rawRole  = formData.get('role') as string | null
  const role     = rawRole === 'owner' || rawRole === 'shop_manager' ? rawRole : 'owner'

  if (!email || !tenantId) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent('Email requerido')}`)
  }

  const { data: existing } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing?.users.find(u => u.email === email)

  if (existingUser?.confirmed_at) {
    // 1. Upsert membership (never overwrites active tenant)
    const { error: membershipError } = await adminClient
      .from('user_tenant_membership')
      .upsert({ user_id: existingUser.id, tenant_id: tenantId, role, is_active: true },
               { onConflict: 'user_id,tenant_id' })
    if (membershipError) {
      redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(membershipError.message)}`)
    }

    // 2. Ensure user_profile exists; only set tenant_id if they have none
    const { data: existingProfile } = await adminClient
      .from('user_profile')
      .select('id, tenant_id')
      .eq('id', existingUser.id)
      .maybeSingle()

    if (existingProfile) {
      // If user has no active tenant yet, switch them to this one
      if (!existingProfile.tenant_id) {
        await adminClient
          .from('user_profile')
          .update({ tenant_id: tenantId })
          .eq('id', existingUser.id)
      }
    } else {
      // No profile at all — create one with this tenant as active
      const meta = existingUser.user_metadata as Record<string, unknown> | null
      const { error } = await adminClient
        .from('user_profile')
        .insert({
          id: existingUser.id,
          tenant_id: tenantId,
          role,
          is_active: true,
          first_name: (meta?.first_name as string) || (existingUser.email?.split('@')[0] ?? ''),
          last_name: (meta?.last_name as string) || '',
        })
      if (error) {
        redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(error.message)}`)
      }
    }

    await logEvent(tenantId, 'admin_assigned', { email, user_id: existingUser.id })
    redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent(`${email} asignado como admin del taller`)}`)
  }

  // Unconfirmed invite exists — delete it so we can resend
  if (existingUser && !existingUser.confirmed_at) {
    await adminClient.auth.admin.deleteUser(existingUser.id)
  }

  const onboardingUrl = `/onboarding?tenant_id=${tenantId}`
  const passwordNext  = `/auth/update-password?next=${encodeURIComponent(onboardingUrl)}`
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(passwordNext)}`,
    data: { tenant_id: tenantId, role },
  })

  if (inviteError) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(inviteError.message)}`)
  }
  await logEvent(tenantId, 'admin_invited', { email })
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent(`Invitación enviada a ${email}`)}`)
}

export async function revokeInvite(formData: FormData) {
  const adminClient = createAdminClient()
  const userId   = formData.get('user_id') as string
  const tenantId = formData.get('tenant_id') as string

  await adminClient.auth.admin.deleteUser(userId)
  await logEvent(tenantId, 'invite_revoked', { user_id: userId })
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent('Invitación revocada')}`)
}

export async function resendInvite(formData: FormData) {
  const adminClient = createAdminClient()
  const userId   = formData.get('user_id') as string
  const email    = formData.get('email') as string
  const tenantId = formData.get('tenant_id') as string

  await adminClient.auth.admin.deleteUser(userId)

  const onboardingUrl = `/onboarding?tenant_id=${tenantId}`
  const passwordNext  = `/auth/update-password?next=${encodeURIComponent(onboardingUrl)}`
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(passwordNext)}`,
    data: { tenant_id: tenantId, role: 'admin' },
  })

  if (error) {
    redirect(`/superadmin/tenants/${tenantId}?tab=users&error=${encodeURIComponent(error.message)}`)
  }
  await logEvent(tenantId, 'invite_resent', { email })
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent(`Invitación reenviada a ${email}`)}`)
}

export async function removeMember(formData: FormData) {
  const adminClient = createAdminClient()
  const userId   = formData.get('user_id') as string
  const tenantId = formData.get('tenant_id') as string

  // Deactivate membership
  await adminClient
    .from('user_tenant_membership')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  // If this was their active tenant, clear it
  await adminClient
    .from('user_profile')
    .update({ tenant_id: null })
    .eq('id', userId)
    .eq('tenant_id', tenantId)

  await logEvent(tenantId, 'member_removed', { user_id: userId })
  redirect(`/superadmin/tenants/${tenantId}?tab=users&success=${encodeURIComponent('Usuario removido del taller')}`)
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
