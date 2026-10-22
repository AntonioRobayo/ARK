'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function connectDrive(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/settings')
  if (profile.role !== 'owner' && profile.role !== 'shop_manager') {
    redirect('/settings/integrations?error=no_permission')
  }

  const folderUrl = (formData.get('folder_url') as string)?.trim()
  if (!folderUrl) redirect('/settings/integrations?error=no_url')

  const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  const folderId = match?.[1]
  if (!folderId) redirect('/settings/integrations?error=invalid_url')

  const { getServiceAccountToken } = await import('@/lib/google-drive')
  let accessToken: string
  try {
    accessToken = await getServiceAccountToken()
  } catch {
    redirect('/settings/integrations?error=service_account_error')
  }

  // Verify the service account can access the folder
  const folderRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!folderRes.ok) redirect('/settings/integrations?error=folder_not_accessible')

  const folderData = await folderRes.json()

  const admin = createAdminClient()
  await admin
    .from('tenants')
    .update({
      gdrive_enabled: true,
      gdrive_root_folder_id: folderId,
      gdrive_connected_email: folderData.name ?? 'Carpeta compartida',
      gdrive_connected_at: new Date().toISOString(),
      gdrive_quota_warning: false,
    })
    .eq('id', profile.tenant_id)

  revalidatePath('/settings/integrations')
  redirect('/settings/integrations?connected=1')
}

export async function disconnectDrive() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return

  const admin = createAdminClient()
  await admin
    .from('tenants')
    .update({
      gdrive_enabled: false,
      gdrive_root_folder_id: null,
      gdrive_connected_email: null,
      gdrive_connected_at: null,
      gdrive_quota_warning: false,
    })
    .eq('id', profile.tenant_id)

  revalidatePath('/settings/integrations')
}
