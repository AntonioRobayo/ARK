'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function upsertQuotation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const workOrderId = formData.get('work_order_id') as string
  const quotationId = formData.get('quotation_id') as string | null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!quotationId) {
    const { data: numRow } = await adminClient.rpc('next_document_number', {
      p_tenant_id: profile.tenant_id,
      p_doc_type: 'COT',
    })
    await adminClient.from('quotation').insert({
      tenant_id: profile.tenant_id,
      work_order_id: workOrderId,
      number: numRow,
      status: 'draft',
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total: 0,
      notes,
      created_by: user.id,
    })
  } else {
    await adminClient.from('quotation').update({ notes }).eq('id', quotationId)
  }

  revalidatePath(`/work-orders/${workOrderId}`)
  redirect(`/work-orders/${workOrderId}/quotation`)
}

export async function addQuotationItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const quotationId = formData.get('quotation_id') as string
  const workOrderId = formData.get('work_order_id') as string
  const description = (formData.get('description') as string).trim()
  const quantity = Number(formData.get('quantity') ?? 1)
  const unitPrice = Number(formData.get('unit_price') ?? 0)
  const itemType = (formData.get('item_type') as string) || 'service'
  const taxRateSnapshot = Number(formData.get('tax_rate') ?? 0)
  const discountPct = Number(formData.get('discount_pct') ?? 0)

  const subtotalBeforeDiscount = quantity * unitPrice
  const discountAmount = subtotalBeforeDiscount * (discountPct / 100)
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount
  const taxAmount = subtotalAfterDiscount * (taxRateSnapshot / 100)
  const subtotal = subtotalAfterDiscount + taxAmount

  await adminClient.from('quotation_item').insert({
    quotation_id: quotationId,
    description,
    quantity,
    unit_price: unitPrice,
    item_type: itemType,
    tax_rate_snapshot: taxRateSnapshot,
    discount_pct: discountPct,
    subtotal,
    authorization_status: 'approved',
    is_customer_supplied: false,
  })

  await recalcQuotationTotals(adminClient, quotationId)
  revalidatePath(`/work-orders/${workOrderId}/quotation`)
  redirect(`/work-orders/${workOrderId}/quotation`)
}

export async function removeQuotationItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const itemId = formData.get('item_id') as string
  const quotationId = formData.get('quotation_id') as string
  const workOrderId = formData.get('work_order_id') as string

  await adminClient.from('quotation_item').delete().eq('id', itemId)
  await recalcQuotationTotals(adminClient, quotationId)

  revalidatePath(`/work-orders/${workOrderId}/quotation`)
  redirect(`/work-orders/${workOrderId}/quotation`)
}

export async function changeQuotationStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const quotationId = formData.get('quotation_id') as string
  const workOrderId = formData.get('work_order_id') as string
  const newStatus = formData.get('status') as string

  const update: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved') update.approved_at = new Date().toISOString()
  if (newStatus === 'sent') update.sent_at = new Date().toISOString()

  await adminClient.from('quotation').update(update).eq('id', quotationId)

  revalidatePath(`/work-orders/${workOrderId}`)
  redirect(`/work-orders/${workOrderId}/quotation`)
}

async function recalcQuotationTotals(adminClient: any, quotationId: string) {
  const { data: items } = await adminClient
    .from('quotation_item').select('subtotal').eq('quotation_id', quotationId)

  const total = (items ?? []).reduce((s: number, i: any) => s + (i.subtotal ?? 0), 0)
  await adminClient.from('quotation').update({
    subtotal: total,
    total,
  }).eq('id', quotationId)
}
