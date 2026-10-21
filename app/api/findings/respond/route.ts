import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const token  = req.nextUrl.searchParams.get('token')
  const action = req.nextUrl.searchParams.get('action')

  if (!token || !['approve_quote', 'note_only'].includes(action ?? '')) {
    return NextResponse.redirect(`${base}/findings/thanks?action=invalid`)
  }

  const admin = createAdminClient()

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
