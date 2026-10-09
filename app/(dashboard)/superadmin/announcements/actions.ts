'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createAnnouncement(formData: FormData) {
  const adminClient = createAdminClient()

  const title    = formData.get('title') as string
  const body     = formData.get('body') as string
  const type     = (formData.get('type') as string) || 'info'
  const startsAt = (formData.get('starts_at') as string) || new Date().toISOString()
  const endsAt   = (formData.get('ends_at') as string) || null

  const { error } = await adminClient
    .from('platform_announcements')
    .insert({ title, body, type, starts_at: startsAt, ends_at: endsAt || null, is_active: true })

  if (error) {
    redirect(`/superadmin/announcements/new?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin/announcements?success=Anuncio publicado')
}

export async function toggleAnnouncement(formData: FormData) {
  const adminClient = createAdminClient()
  const id       = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const { error } = await adminClient
    .from('platform_announcements')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) {
    redirect(`/superadmin/announcements?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin/announcements')
}
