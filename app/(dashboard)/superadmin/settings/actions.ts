'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function saveConfig(formData: FormData) {
  const adminClient = createAdminClient()

  const keys = ['support_email', 'platform_name', 'terms_url', 'maintenance_mode']
  const updates = keys.map(key => ({
    key,
    value: (formData.get(key) as string) ?? '',
    updated_at: new Date().toISOString(),
  }))

  const { error } = await adminClient
    .from('platform_config')
    .upsert(updates, { onConflict: 'key' })

  if (error) {
    redirect(`/superadmin/settings?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin/settings?success=Configuración guardada')
}
