'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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
      gdrive_refresh_token: null,
      gdrive_root_folder_id: null,
      gdrive_connected_email: null,
      gdrive_connected_at: null,
      gdrive_quota_warning: false,
    })
    .eq('id', profile.tenant_id)

  revalidatePath('/settings/integrations')
  redirect('/settings/integrations')
}
