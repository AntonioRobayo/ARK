import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const admin = createAdminClient()

  const { data: quotation } = await admin
    .from('quotation')
    .select(`
      id, number, status, subtotal, tax_amount, total, tenant_id,
      quotation_item(id, description, quantity, unit_price, subtotal, item_type, customer_response),
      work_order:work_order_id(
        number,
        customer:customer_id(first_name, last_name),
        vehicle:vehicle_id(plate, brand, model, year)
      )
    `)
    .eq('response_token', token)
    .single()

  if (!quotation) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const wo       = Array.isArray(quotation.work_order) ? quotation.work_order[0] : quotation.work_order as any
  const customer = Array.isArray(wo?.customer) ? wo.customer[0] : wo?.customer
  const vehicle  = Array.isArray(wo?.vehicle)  ? wo.vehicle[0]  : wo?.vehicle

  const { data: tenant } = await admin.from('tenants').select('name, settings').eq('id', quotation.tenant_id).single()
  const tenantSettings = (tenant?.settings ?? {}) as Record<string, string>

  const items = (quotation.quotation_item ?? []) as any[]
  const alreadyResponded = items.some(i => i.customer_response !== null)

  return NextResponse.json({
    quotationNumber: quotation.number,
    otNumber:        String(wo?.number ?? ''),
    vehiclePlate:    vehicle?.plate ?? '',
    vehicleLabel:    [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(' '),
    customerName:    customer ? `${customer.first_name} ${customer.last_name}` : '',
    workshopName:    tenant?.name ?? '',
    workshopLogoUrl: tenantSettings.logo_url ?? null,
    items:           items.map(i => ({
      id:               i.id,
      description:      i.description,
      quantity:         i.quantity,
      unitPrice:        i.unit_price,
      subtotal:         i.subtotal,
      itemType:         i.item_type,
      customer_response: i.customer_response,
    })),
    alreadyResponded,
    subtotal:   quotation.subtotal ?? 0,
    taxAmount:  quotation.tax_amount ?? 0,
    total:      quotation.total ?? 0,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.token || !body?.decisions) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const { token, decisions } = body as {
    token: string
    decisions: Record<string, 'approved' | 'rejected'>
  }

  const admin = createAdminClient()

  const { data: quotation } = await admin
    .from('quotation')
    .select('id, tenant_id, number, work_order_id, quotation_item(id)')
    .eq('response_token', token)
    .single()

  if (!quotation) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const items = (quotation.quotation_item ?? []) as { id: string }[]

  // Update customer_response for each item
  const updates = items.map(item =>
    admin.from('quotation_item')
      .update({ customer_response: decisions[item.id] ?? null })
      .eq('id', item.id)
  )
  await Promise.all(updates)

  // If at least one item approved → mark quotation as approved
  const hasApproval = Object.values(decisions).some(d => d === 'approved')
  if (hasApproval) {
    await admin.from('quotation')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', quotation.id)
  }

  // Audit log
  const approved = items.filter(i => decisions[i.id] === 'approved').length
  const rejected = items.filter(i => decisions[i.id] === 'rejected').length

  await admin.from('tenant_audit_log').insert({
    tenant_id: quotation.tenant_id,
    event:     'quotation.customer_responded',
    details:   {
      quotation_id:    quotation.id,
      quotation_number: quotation.number,
      work_order_id:   quotation.work_order_id,
      items_approved:  approved,
      items_rejected:  rejected,
      decisions,
    },
  })

  return NextResponse.json({ ok: true })
}
