'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/lib/permissions'

export async function toggleUserPermission(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const canManage = await checkPermission('users.manage_roles')
  if (!canManage) redirect('/settings/roles?error=' + encodeURIComponent('Sin permiso'))

  const targetUserId   = formData.get('user_id') as string
  const permissionId   = formData.get('permission_id') as string
  const action         = formData.get('action') as 'grant' | 'revoke' | 'clear'
  const redirectUser   = formData.get('redirect_user') as string

  const adminClient = createAdminClient()

  // Verify same tenant
  const { data: myProfile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  const { data: targetProfile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', targetUserId).single()

  if (!myProfile?.tenant_id || myProfile.tenant_id !== targetProfile?.tenant_id) {
    redirect('/settings/roles?error=' + encodeURIComponent('Usuario no encontrado'))
  }

  // Read current state before mutating (for old_values in audit log)
  const { data: existing } = await adminClient
    .from('user_permission')
    .select('granted')
    .eq('user_id', targetUserId)
    .eq('permission_id', permissionId)
    .maybeSingle()

  if (action === 'clear') {
    await adminClient
      .from('user_permission')
      .delete()
      .eq('user_id', targetUserId)
      .eq('permission_id', permissionId)
  } else {
    await adminClient
      .from('user_permission')
      .upsert(
        { user_id: targetUserId, permission_id: permissionId, granted: action === 'grant', granted_by: user.id },
        { onConflict: 'user_id,permission_id' }
      )
  }

  // Audit log
  await adminClient.from('audit_log').insert({
    tenant_id:    myProfile.tenant_id,
    table_name:   'user_permission',
    record_id:    targetUserId,
    action:       action === 'clear' ? 'DELETE' : existing ? 'UPDATE' : 'INSERT',
    old_values:   existing ? { granted: existing.granted, permission_id: permissionId } : null,
    new_values:   action === 'clear' ? null : { granted: action === 'grant', permission_id: permissionId },
    performed_by: user.id,
  })

  revalidatePath('/settings/roles')
  redirect(`/settings/roles?success=1&user=${redirectUser}`)
}
