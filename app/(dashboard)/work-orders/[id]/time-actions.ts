'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startTimer(otId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  await supabase.from('work_order_time_log').insert({
    work_order_id: otId,
    technician_id: user.id,
    tenant_id: profile!.tenant_id,
    started_at: new Date().toISOString(),
  })

  revalidatePath(`/work-orders/${otId}`)
}

export async function stopTimer(entryId: string, otId: string, notes?: string) {
  const supabase = await createClient()
  const now = new Date()

  const { data: entry } = await supabase
    .from('work_order_time_log')
    .select('started_at')
    .eq('id', entryId)
    .single()

  if (!entry) return

  const startedAt = new Date(entry.started_at)
  const minutes = Math.round((now.getTime() - startedAt.getTime()) / 60000)

  await supabase.from('work_order_time_log').update({
    ended_at: now.toISOString(),
    minutes,
    notes: notes || null,
  }).eq('id', entryId)

  revalidatePath(`/work-orders/${otId}`)
}
