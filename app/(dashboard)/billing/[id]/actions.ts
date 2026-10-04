'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return

  const invoiceId = formData.get('invoice_id') as string
  const workOrderId = formData.get('work_order_id') as string
  const amount = Number(formData.get('amount') ?? 0)
  const paymentMethodId = (formData.get('payment_method_id') as string) || null
  const cashRegisterId = (formData.get('cash_register_id') as string) || null
  const reference = (formData.get('reference') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (amount <= 0) {
    revalidatePath(`/billing/${invoiceId}`)
    return
  }

  await supabase.from('payment').insert({
    tenant_id: profile.tenant_id,
    invoice_id: invoiceId,
    work_order_id: workOrderId,
    payment_method_id: paymentMethodId || null,
    cash_register_id: cashRegisterId || null,
    amount,
    reference,
    notes,
    received_by: user.id,
    payment_date: new Date().toISOString(),
    is_advance: false,
  })

  // Update invoice paid_amount and status
  const { data: invoice } = await supabase
    .from('invoice').select('total, paid_amount').eq('id', invoiceId).single()

  if (invoice) {
    const newPaid = (invoice.paid_amount ?? 0) + amount
    const newStatus = newPaid >= invoice.total ? 'paid' : 'partially_paid'
    await supabase.from('invoice').update({
      paid_amount: newPaid,
      status: newStatus,
      ...(newStatus === 'paid' ? { closed_at: new Date().toISOString() } : {}),
    }).eq('id', invoiceId)
  }

  revalidatePath(`/billing/${invoiceId}`)
  redirect(`/billing/${invoiceId}`)
}

export async function voidInvoice(formData: FormData) {
  const supabase = await createClient()
  const invoiceId = formData.get('invoice_id') as string
  await supabase.from('invoice').update({ status: 'void' }).eq('id', invoiceId)
  revalidatePath(`/billing/${invoiceId}`)
  redirect(`/billing/${invoiceId}`)
}
