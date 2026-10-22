'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function saveBranding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const tenantId = profile.tenant_id
  const tc = (formData.get('terms_and_conditions') as string)?.trim() || null

  // Fetch current settings to merge
  const { data: tenant } = await admin
    .from('tenants').select('settings').eq('id', tenantId).single()
  const currentSettings: Record<string, unknown> = (tenant?.settings as Record<string, unknown>) ?? {}

  let logoUrl: string | undefined = currentSettings.logo_url as string | undefined

  // Handle logo upload
  const logoFile = formData.get('logo') as File | null
  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png'
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      redirect('/settings/branding?error=' + encodeURIComponent('Formato no válido. Usa PNG, JPG, WebP o SVG.'))
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      redirect('/settings/branding?error=' + encodeURIComponent('El archivo no puede superar 2 MB.'))
    }

    const buffer = await logoFile.arrayBuffer()
    const path = `branding/${tenantId}/logo.${ext}`

    const { error: uploadError } = await admin.storage
      .from('assets')
      .upload(path, buffer, { contentType: logoFile.type, upsert: true })

    if (!uploadError) {
      const { data: urlData } = admin.storage.from('assets').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    } else {
      redirect('/settings/branding?error=' + encodeURIComponent('Error subiendo el logo: ' + uploadError.message))
    }
  }

  await admin.from('tenants').update({
    settings: {
      ...currentSettings,
      ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
      terms_and_conditions: tc,
    },
  }).eq('id', tenantId)

  revalidatePath('/settings/branding')
  redirect('/settings/branding?success=1')
}

export async function removeLogo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const tenantId = profile.tenant_id
  const { data: tenant } = await admin
    .from('tenants').select('settings').eq('id', tenantId).single()
  const currentSettings: Record<string, unknown> = (tenant?.settings as Record<string, unknown>) ?? {}

  // Try to remove from storage (best effort)
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    await admin.storage.from('assets').remove([`branding/${tenantId}/logo.${ext}`])
  }

  const { logo_url: _removed, ...rest } = currentSettings
  await admin.from('tenants').update({ settings: rest }).eq('id', tenantId)

  revalidatePath('/settings/branding')
  redirect('/settings/branding?success=1')
}
