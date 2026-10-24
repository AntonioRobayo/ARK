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

  const workOrderId = formData.get('work_order_id') as string
  const tenantId    = formData.get('tenant_id') as string
  const quotationId = formData.get('quotation_id') as string | null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!tenantId) return

  if (!quotationId) {
    const { data: numRow } = await adminClient.rpc('next_document_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'COT',
    })
    await adminClient.from('quotation').insert({
      tenant_id: tenantId,
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
  const quotationId   = formData.get('quotation_id') as string
  const workOrderId   = formData.get('work_order_id') as string
  const description   = (formData.get('description') as string).trim()
  const quantity      = Number(formData.get('quantity') ?? 1)
  const unitPrice     = Number(formData.get('unit_price') ?? 0)
  const itemType      = (formData.get('item_type') as string) || 'service'
  const taxRateSnapshot = Number(formData.get('tax_rate') ?? 0)
  const discountPct   = Number(formData.get('discount_pct') ?? 0)
  const currentTotal  = Number(formData.get('current_total') ?? 0)

  const subtotalBeforeDiscount = quantity * unitPrice
  const discountAmount = subtotalBeforeDiscount * (discountPct / 100)
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount
  const taxAmount = subtotalAfterDiscount * (taxRateSnapshot / 100)
  const subtotal = subtotalAfterDiscount + taxAmount
  const newTotal = currentTotal + subtotal

  // Insert item + update totals in parallel — no need to SELECT all items to recalc
  await Promise.all([
    adminClient.from('quotation_item').insert({
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
    }),
    adminClient.from('quotation').update({ subtotal: newTotal, total: newTotal }).eq('id', quotationId),
  ])

  revalidatePath(`/work-orders/${workOrderId}/quotation`)
}

export async function removeQuotationItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const itemId       = formData.get('item_id') as string
  const quotationId  = formData.get('quotation_id') as string
  const workOrderId  = formData.get('work_order_id') as string
  const itemSubtotal = Number(formData.get('item_subtotal') ?? 0)
  const currentTotal = Number(formData.get('current_total') ?? 0)
  const newTotal     = Math.max(0, currentTotal - itemSubtotal)

  // Delete item + update totals in parallel
  await Promise.all([
    adminClient.from('quotation_item').delete().eq('id', itemId),
    adminClient.from('quotation').update({ subtotal: newTotal, total: newTotal }).eq('id', quotationId),
  ])

  revalidatePath(`/work-orders/${workOrderId}/quotation`)
}

export async function changeQuotationStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const quotationId = formData.get('quotation_id') as string
  const workOrderId = formData.get('work_order_id') as string
  const newStatus = formData.get('status') as string

  const responseToken = newStatus === 'sent' ? crypto.randomUUID() : undefined
  const update: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved') update.approved_at = new Date().toISOString()
  if (newStatus === 'sent') {
    update.sent_at = new Date().toISOString()
    update.response_token = responseToken
  }

  await adminClient.from('quotation').update(update).eq('id', quotationId)

  // Send quotation email when marking as sent
  if (newStatus === 'sent') {
    void (async () => {
      try {
        const { data: quotation } = await adminClient
          .from('quotation')
          .select(`number, subtotal, tax_amount, discount_amount, total,
            quotation_item(id, description, quantity, unit_price, subtotal, item_type),
            work_order:work_order_id(number, tenant_id,
              customer:customer_id(first_name, last_name, email),
              vehicle:vehicle_id(plate, brand, model, year))`)
          .eq('id', quotationId)
          .single()

        if (!quotation) return
        const wo = Array.isArray(quotation.work_order) ? quotation.work_order[0] : quotation.work_order as any
        const customer = Array.isArray(wo?.customer) ? wo.customer[0] : wo?.customer
        const vehicle = Array.isArray(wo?.vehicle) ? wo.vehicle[0] : wo?.vehicle
        if (!customer?.email) return

        const { data: tenant } = await adminClient.from('tenants').select('name, settings').eq('id', wo.tenant_id).single()
        const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

        const { sendQuotationEmail } = await import('@/lib/email')
        await sendQuotationEmail({
          to: customer.email,
          customerName: `${customer.first_name} ${customer.last_name}`,
          workshopName: tenant?.name ?? 'ARK Workshop',
          workshopLogoUrl: tenantSettings.logo_url,
          termsAndConditions: tenantSettings.terms_and_conditions,
          respondUrl: responseToken ? `${base}/quotation/respond/${responseToken}` : undefined,
          otNumber: String(wo.number),
          quotationNumber: String(quotation.number),
          vehiclePlate: vehicle?.plate ?? '',
          vehicleLabel: [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(' '),
          items: (quotation.quotation_item ?? []).map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            subtotal: i.subtotal,
            itemType: i.item_type,
          })),
          subtotal: quotation.subtotal ?? 0,
          taxAmount: quotation.tax_amount ?? 0,
          discountAmount: quotation.discount_amount ?? 0,
          total: quotation.total ?? 0,
        })
      } catch { /* email failure should not block status change */ }
    })()
  }

  revalidatePath(`/work-orders/${workOrderId}`)
  redirect(`/work-orders/${workOrderId}/quotation${newStatus === 'sent' ? '?sent=1' : ''}`)
}

