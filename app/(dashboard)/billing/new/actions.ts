'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const workOrderId = formData.get('work_order_id') as string
  const quotationId = formData.get('quotation_id') as string
  const notes = (formData.get('notes') as string)?.trim() || null
  const dueAt = formData.get('due_at') as string | null

  const { data: quotation } = await adminClient
    .from('quotation')
    .select('*, quotation_item(*)')
    .eq('id', quotationId)
    .single()

  if (!quotation) {
    redirect(`/work-orders/${workOrderId}?error=Cotización no encontrada`)
  }

  const { data: numRow } = await adminClient.rpc('next_document_number', {
    p_tenant_id: profile.tenant_id,
    p_doc_type: 'FAC',
  })

  const { data: invoice, error } = await adminClient.from('invoice').insert({
    tenant_id: profile.tenant_id,
    work_order_id: workOrderId,
    number: numRow,
    status: 'issued',
    subtotal: quotation.subtotal,
    tax_amount: quotation.tax_amount,
    discount_amount: quotation.discount_amount,
    total: quotation.total,
    paid_amount: 0,
    issued_at: new Date().toISOString(),
    due_at: dueAt || null,
    notes,
    created_by: user.id,
  }).select('id').single()

  if (error || !invoice) {
    redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(error?.message ?? 'Error al crear factura')}`)
  }

  // Copy quotation_items as invoice_lines
  const lines = (quotation.quotation_item ?? []).map((item: any) => ({
    invoice_id: invoice.id,
    quotation_item_id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate_snapshot: item.tax_rate_snapshot,
    discount_pct: item.discount_pct,
    subtotal: item.subtotal,
  }))

  if (lines.length > 0) {
    await adminClient.from('invoice_line').insert(lines)
  }

  redirect(`/billing/${invoice.id}`)
}
