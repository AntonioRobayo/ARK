'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

function localToUTC(localDatetime: string, tzOffsetMinutes: number): string {
  // localDatetime is "YYYY-MM-DDTHH:MM" (no timezone), tzOffsetMinutes is offset from UTC
  const localMs = new Date(localDatetime).getTime()
  return new Date(localMs - tzOffsetMinutes * 60_000).toISOString()
}

export async function createAnnouncement(formData: FormData) {
  const adminClient = createAdminClient()

  const title         = formData.get('title') as string
  const body          = formData.get('body') as string
  const type          = (formData.get('type') as string) || 'info'
  const startsAtRaw   = formData.get('starts_at') as string
  const endsAtRaw     = formData.get('ends_at') as string | null
  const tzOffset      = Number(formData.get('starts_at_tz_offset') || 0)

  const startsAt = startsAtRaw ? localToUTC(startsAtRaw, tzOffset) : new Date().toISOString()
  const endsAt   = endsAtRaw   ? localToUTC(endsAtRaw, tzOffset)   : null

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
