'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveQuote(
  quotationId: string
): Promise<{ ok: boolean; error: string | null }> {
  const adminClient = createAdminClient()

  // Verify quotation exists and is in an approvable state
  const { data: quotation } = await adminClient
    .from('quotation')
    .select('id, status')
    .eq('id', quotationId)
    .single()

  if (!quotation) return { ok: false, error: 'Cotización no encontrada.' }
  if (quotation.status === 'approved') return { ok: true, error: null }
  if (quotation.status === 'rejected') {
    return { ok: false, error: 'Esta cotización ya fue rechazada.' }
  }

  const { error } = await adminClient
    .from('quotation')
    .update({ status: 'approved' })
    .eq('id', quotationId)

  if (error) return { ok: false, error: 'No se pudo aprobar la cotización.' }

  revalidatePath(`/q/${quotationId}`)
  return { ok: true, error: null }
}

export async function rejectQuote(
  quotationId: string
): Promise<{ ok: boolean; error: string | null }> {
  const adminClient = createAdminClient()

  const { data: quotation } = await adminClient
    .from('quotation')
    .select('id, status')
    .eq('id', quotationId)
    .single()

  if (!quotation) return { ok: false, error: 'Cotización no encontrada.' }
  if (quotation.status === 'rejected') return { ok: true, error: null }
  if (quotation.status === 'approved') {
    return { ok: false, error: 'Esta cotización ya fue aprobada.' }
  }

  const { error } = await adminClient
    .from('quotation')
    .update({ status: 'rejected' })
    .eq('id', quotationId)

  if (error) return { ok: false, error: 'No se pudo rechazar la cotización.' }

  revalidatePath(`/q/${quotationId}`)
  return { ok: true, error: null }
}
