'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/lib/permissions'

export async function inviteUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role  = (formData.get('role') as string)?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/settings/users?error=' + encodeURIComponent('Ingresa un correo electrónico válido'))
  }

  const adminClient = createAdminClient()

  // Fetch the current user's tenant_id
  const { data: myProfile, error: profileError } = await adminClient
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !myProfile?.tenant_id) {
    redirect('/settings/users?error=' + encodeURIComponent('No se pudo obtener la información del taller'))
  }

  const canInvite = await checkPermission('users.invite')
  if (!canInvite) {
    redirect('/settings/users?error=' + encodeURIComponent('No tienes permiso para invitar usuarios'))
  }

  // Check active user limit against license plan
  const { data: tenant } = await adminClient
    .from('tenants').select('plan').eq('id', myProfile.tenant_id).single()
  if (tenant?.plan) {
    const { data: plan } = await adminClient
      .from('license_plan').select('max_users').eq('slug', tenant.plan).single()
    if (plan?.max_users) {
      const { count } = await adminClient
        .from('user_profile')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', myProfile.tenant_id)
        .eq('is_active', true)
      if ((count ?? 0) >= plan.max_users) {
        redirect('/settings/users?error=' + encodeURIComponent(
          `Has alcanzado el límite de ${plan.max_users} usuarios activos de tu plan`
        ))
      }
    }
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: myProfile.tenant_id,
      role: role || null,
    },
  })

  if (inviteError) {
    redirect('/settings/users?error=' + encodeURIComponent(inviteError.message))
  }

  revalidatePath('/settings/users')
  redirect('/settings/users?success=invited')
}

export async function changeRole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const targetUserId = formData.get('user_id') as string
  const newRole      = formData.get('role') as string

  const ALLOWED = ['owner', 'shop_manager', 'mechanic', 'receptionist', 'parts_manager', 'accountant']
  if (!targetUserId || !ALLOWED.includes(newRole)) {
    redirect('/settings/users?error=' + encodeURIComponent('Datos no válidos'))
  }

  const adminClient = createAdminClient()

  const { data: myProfile } = await adminClient
    .from('user_profile').select('tenant_id, role').eq('id', user.id).single()

  const canManageRoles = await checkPermission('users.manage_roles')
  if (!canManageRoles) {
    redirect('/settings/users?error=' + encodeURIComponent('No tienes permiso para cambiar roles'))
  }

  if (!myProfile?.tenant_id) {
    redirect('/settings/users?error=' + encodeURIComponent('No se pudo obtener la información del taller'))
  }

  const { data: targetProfile } = await adminClient
    .from('user_profile').select('tenant_id, role').eq('id', targetUserId).single()

  if (!targetProfile || targetProfile.tenant_id !== myProfile.tenant_id) {
    redirect('/settings/users?error=' + encodeURIComponent('Usuario no encontrado en este taller'))
  }

  if (targetProfile.role === 'owner') {
    redirect('/settings/users?error=' + encodeURIComponent('No puedes cambiar el rol del dueño'))
  }

  const { error } = await adminClient
    .from('user_profile').update({ role: newRole }).eq('id', targetUserId)

  if (error) redirect('/settings/users?error=' + encodeURIComponent(error.message))

  await adminClient
    .from('user_tenant_membership')
    .update({ role: newRole })
    .eq('user_id', targetUserId)
    .eq('tenant_id', myProfile.tenant_id)

  revalidatePath('/settings/users')
  redirect('/settings/users?success=updated')
}

export async function toggleUserActive(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const targetUserId = formData.get('user_id') as string
  const newActive    = formData.get('is_active') === 'true'

  if (!targetUserId) {
    redirect('/settings/users?error=' + encodeURIComponent('Usuario no válido'))
  }

  const adminClient = createAdminClient()

  // Verify current user is owner or shop_manager and in same tenant
  const { data: myProfile } = await adminClient
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!myProfile?.tenant_id) {
    redirect('/settings/users?error=' + encodeURIComponent('No se pudo obtener la información del taller'))
  }

  const canDeactivate = await checkPermission('users.deactivate')
  if (!canDeactivate) {
    redirect('/settings/users?error=' + encodeURIComponent('No tienes permiso para modificar usuarios'))
  }

  // Fetch target user and confirm same tenant
  const { data: targetProfile } = await adminClient
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', targetUserId)
    .single()

  if (!targetProfile || targetProfile.tenant_id !== myProfile.tenant_id) {
    redirect('/settings/users?error=' + encodeURIComponent('Usuario no encontrado en este taller'))
  }

  // Prevent deactivating owner
  if (targetProfile.role === 'owner') {
    redirect('/settings/users?error=' + encodeURIComponent('El dueño no puede ser desactivado'))
  }

  const { error } = await adminClient
    .from('user_profile')
    .update({ is_active: newActive })
    .eq('id', targetUserId)

  if (error) {
    redirect('/settings/users?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings/users')
  redirect('/settings/users?success=updated')
}
