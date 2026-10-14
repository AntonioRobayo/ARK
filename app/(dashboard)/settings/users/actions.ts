'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

  // Only owner and shop_manager may invite
  if (myProfile.role !== 'owner' && myProfile.role !== 'shop_manager') {
    redirect('/settings/users?error=' + encodeURIComponent('No tienes permiso para invitar usuarios'))
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

  if (myProfile.role !== 'owner' && myProfile.role !== 'shop_manager') {
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
