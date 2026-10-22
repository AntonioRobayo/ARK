import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const base   = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const token  = req.nextUrl.searchParams.get('token')
  const action = req.nextUrl.searchParams.get('action')

  if (!token) return NextResponse.redirect(`${base}/findings/thanks?action=invalid`)

  const admin = createAdminClient()

  // New: load data for the respond page
  if (action === 'load') {
    const { data: findings } = await admin
      .from('work_order_finding')
      .select('id, description, severity, status, work_order_id')
      .eq('response_token', token)

    if (!findings || findings.length === 0) {
      return NextResponse.json({ alreadyResponded: true })
    }

    const alreadyResponded = findings.every(f => f.status !== 'notified')

    const otId = findings[0].work_order_id
    const { data: ot } = await admin
      .from('work_order')
      .select('number, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate), branch:branch_id(name)')
      .eq('id', otId)
      .single()

    const customer = Array.isArray(ot?.customer) ? ot.customer[0] : ot?.customer
    const vehicle  = Array.isArray(ot?.vehicle)  ? ot.vehicle[0]  : ot?.vehicle

    return NextResponse.json({
      otNumber:      ot?.number ?? '',
      vehiclePlate:  vehicle?.plate ?? '',
      customerName:  customer ? `${customer.first_name} ${customer.last_name}` : '',
      workshopName:  'ARK Workshop',
      alreadyResponded,
      findings: findings.map(f => ({
        id:          f.id,
        description: f.description,
        severity:    f.severity,
        status:      f.status,
      })),
    })
  }

  // Legacy: direct action links from old emails
  if (!['approve_quote', 'note_only'].includes(action ?? '')) {
    return NextResponse.redirect(`${base}/findings/thanks?action=invalid`)
  }

  const { data: findings } = await admin
    .from('work_order_finding')
    .select('id, status')
    .eq('response_token', token)
    .eq('status', 'notified')

  if (!findings || findings.length === 0) {
    return NextResponse.redirect(`${base}/findings/thanks?action=already`)
  }

  await admin
    .from('work_order_finding')
    .update({
      status: action as string,
      customer_response: action as string,
      customer_responded_at: new Date().toISOString(),
    })
    .eq('response_token', token)

  return NextResponse.redirect(`${base}/findings/thanks?action=${action}`)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token: string | undefined = body?.token
  const decisions: Record<string, 'approve_quote' | 'note_only'> = body?.decisions ?? {}

  if (!token || Object.keys(decisions).length === 0) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: findings } = await admin
    .from('work_order_finding')
    .select('id, status')
    .eq('response_token', token)
    .eq('status', 'notified')

  if (!findings || findings.length === 0) {
    return NextResponse.json({ error: 'already_responded' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const updates = findings
    .filter(f => decisions[f.id])
    .map(f => admin
      .from('work_order_finding')
      .update({
        status:                 decisions[f.id],
        customer_response:      decisions[f.id],
        customer_responded_at:  now,
      })
      .eq('id', f.id)
    )

  await Promise.all(updates)

  return NextResponse.json({ ok: true })
}
