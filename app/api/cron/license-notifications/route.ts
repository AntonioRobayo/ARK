import { createAdminClient } from '@/lib/supabase/admin'
import { sendLicenseExpiryTodayEmail, sendLicenseExpiredEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Get today and yesterday in UTC date format
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Fetch tenants expiring today or yesterday (window: yesterday 00:00 → today 23:59 UTC)
  const windowStart = `${yesterdayStr}T00:00:00.000Z`
  const windowEnd   = `${todayStr}T23:59:59.999Z`

  const { data: tenants } = await adminClient
    .from('tenants')
    .select('id, name, plan_expires_at, license_plan!plan_id(name)')
    .gte('plan_expires_at', windowStart)
    .lte('plan_expires_at', windowEnd)
    .eq('is_active', true)

  if (!tenants?.length) {
    return NextResponse.json({ notified: 0 })
  }

  // Get all user IDs for these tenants
  const tenantIds = tenants.map(t => t.id)
  const { data: profiles } = await adminClient
    .from('user_profile')
    .select('id, tenant_id')
    .in('tenant_id', tenantIds)

  if (!profiles?.length) {
    return NextResponse.json({ notified: 0 })
  }

  // Fetch auth emails for all users in one call
  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(users.map(u => [u.id, u.email ?? '']))

  let notified = 0

  for (const tenant of tenants) {
    const expiresDate = new Date(tenant.plan_expires_at as string)
    expiresDate.setUTCHours(0, 0, 0, 0)
    const expiresStr = expiresDate.toISOString().slice(0, 10)

    const tenantProfiles = profiles.filter(p => p.tenant_id === tenant.id)
    const planName = (tenant.license_plan as { name: string } | null)?.name ?? 'Plan ARK'

    for (const profile of tenantProfiles) {
      const email = emailMap.get(profile.id)
      if (!email) continue

      try {
        if (expiresStr === todayStr) {
          await sendLicenseExpiryTodayEmail({ to: email, workshopName: tenant.name, planName })
        } else {
          await sendLicenseExpiredEmail({ to: email, workshopName: tenant.name, planName })
        }
        notified++
      } catch {
        // Log but don't fail the whole cron
        console.error(`Failed to send license email to ${email}`)
      }
    }
  }

  return NextResponse.json({ notified })
}
