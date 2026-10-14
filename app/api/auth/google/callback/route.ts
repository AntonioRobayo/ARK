import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL)!

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings/integrations?error=drive_denied`)
  }

  // Verify user is still logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/auth/login`)

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/settings/integrations?error=drive_token_failed`)
  }

  const tokens = await tokenRes.json()
  const { refresh_token, access_token } = tokens

  if (!refresh_token) {
    return NextResponse.redirect(`${base}/settings/integrations?error=drive_no_refresh_token`)
  }

  // Get connected account email
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}

  // Create root folder "ARK Workshop — [Taller]" in Drive
  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.redirect(`${base}/settings/integrations?error=drive_no_tenant`)
  }

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  // Create root folder in Drive
  const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `ARK Workshop — ${tenant?.name ?? 'Taller'}`,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })

  const rootFolderId = folderRes.ok ? (await folderRes.json()).id : null

  // Store encrypted refresh token
  await admin
    .from('tenants')
    .update({
      gdrive_enabled: true,
      gdrive_refresh_token: encrypt(refresh_token),
      gdrive_root_folder_id: rootFolderId,
      gdrive_connected_email: userInfo.email ?? null,
      gdrive_connected_at: new Date().toISOString(),
      gdrive_quota_warning: false,
    })
    .eq('id', profile.tenant_id)

  return NextResponse.redirect(`${base}/settings/integrations?connected=1`)
}
