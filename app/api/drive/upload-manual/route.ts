import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAccessToken, checkQuota, getOrCreateFolder,
  uploadFileToDrive, QUOTA_BLOCK_BYTES,
} from '@/lib/google-drive'

export const MANUAL_SECTIONS: Record<string, string> = {
  procedimientos: 'Procedimientos',
  formatos: 'Formatos',
  capacitacion: 'Capacitación',
  seguridad: 'Seguridad',
  garantias: 'Garantías',
  contratos: 'Contratos',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id, role_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 400 })
  const tenantId = profile.tenant_id

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('name, gdrive_enabled, gdrive_root_folder_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.gdrive_enabled || !tenant?.gdrive_root_folder_id) {
    return NextResponse.json({ error: 'Google Drive not configured' }, { status: 412 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const section = (formData.get('section') as string) || 'procedimientos'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const sectionLabel = MANUAL_SECTIONS[section] ?? section

  let accessToken: string
  try {
    accessToken = await getAccessToken(tenantId)
  } catch {
    return NextResponse.json({ error: 'drive_token_error' }, { status: 503 })
  }

  const quota = await checkQuota(accessToken)
  if (quota.available < QUOTA_BLOCK_BYTES) {
    return NextResponse.json({ error: 'drive_quota_exceeded', available: quota.available }, { status: 507 })
  }

  // Resolve Manuales/[section] folder
  const manualesFolder = await getOrCreateFolder(accessToken, tenant.gdrive_root_folder_id, 'Manuales')
  const sectionFolder = await getOrCreateFolder(accessToken, manualesFolder, sectionLabel)

  const arrayBuffer = await file.arrayBuffer()
  const driveFile = await uploadFileToDrive(accessToken, sectionFolder, arrayBuffer, file.name, file.type)

  const { data: attachment } = await supabase
    .from('work_order_drive_attachment')
    .insert({
      tenant_id: tenantId,
      work_order_id: null,
      vehicle_id: null,
      section: `manual_${section}`,
      drive_file_id: driveFile.id,
      drive_thumb_url: driveFile.thumbnailLink ?? null,
      original_name: file.name,
      mime_type: file.type,
      size_kb: Math.round(file.size / 1024),
      uploaded_by: user.id,
    })
    .select()
    .single()

  return NextResponse.json({
    id: attachment?.id,
    drive_file_id: driveFile.id,
    web_view_link: driveFile.webViewLink,
    name: file.name,
    section,
  })
}
