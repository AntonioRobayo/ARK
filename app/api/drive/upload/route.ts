import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getServiceAccountToken, getOtSectionFolder,
  uploadFileToDrive, driveThumbnailUrl,
} from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 400 })
  const tenantId = profile.tenant_id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const workOrderId = formData.get('work_order_id') as string | null
  const vehicleId = formData.get('vehicle_id') as string | null
  const section = (formData.get('section') as string) || 'trabajo'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch tenant and work order metadata in parallel
  const [{ data: tenant }, { data: workOrder }] = await Promise.all([
    admin.from('tenants').select('name, gdrive_enabled, gdrive_root_folder_id, gdrive_quota_warning').eq('id', tenantId).single(),
    workOrderId
      ? admin.from('work_order').select('number, vehicle_id, vehicle:vehicle_id(plate, brand, model)').eq('id', workOrderId).single()
      : Promise.resolve({ data: null }),
  ])

  if (!tenant?.gdrive_enabled || !tenant?.gdrive_root_folder_id) {
    return NextResponse.json({ error: 'Google Drive not configured' }, { status: 412 })
  }

  let accessToken: string
  try {
    accessToken = await getServiceAccountToken()
  } catch {
    return NextResponse.json({ error: 'drive_token_error' }, { status: 503 })
  }

  const shouldWarn = false

  // Resolve target folder
  const vehicle = (Array.isArray(workOrder?.vehicle) ? workOrder.vehicle[0] : workOrder?.vehicle) as { plate: string; brand: string; model: string } | null
  const vehicleIdResolved = vehicleId ?? workOrder?.vehicle_id ?? null

  if (!vehicleIdResolved) return NextResponse.json({ error: 'No vehicle_id' }, { status: 400 })

  const targetFolderId = await getOtSectionFolder({
    accessToken,
    tenantId,
    tenantName: tenant.name,
    vehicleId: vehicleIdResolved,
    vehiclePlate: vehicle?.plate ?? vehicleIdResolved.slice(0, 8).toUpperCase(),
    vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : '',
    otId: workOrderId ?? '__none__',
    otNumber: workOrder?.number ?? 0,
    section,
  })

  // Upload file
  const arrayBuffer = await file.arrayBuffer()
  const timestamp = Date.now()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${timestamp}.${ext}`

  const driveFile = await uploadFileToDrive(accessToken, targetFolderId, arrayBuffer, filename, file.type)
  const thumbUrl = driveThumbnailUrl(driveFile.id)

  // Save metadata to Supabase
  const { data: attachment, error: insertErr } = await supabase
    .from('work_order_drive_attachment')
    .insert({
      tenant_id: tenantId,
      work_order_id: workOrderId ?? null,
      vehicle_id: vehicleIdResolved,
      section,
      drive_file_id: driveFile.id,
      drive_thumb_url: thumbUrl,
      original_name: file.name,
      mime_type: file.type,
      size_kb: Math.round(file.size / 1024),
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 })
  }

  return NextResponse.json({
    id: attachment.id,
    drive_file_id: driveFile.id,
    thumb_url: thumbUrl,
    web_view_link: driveFile.webViewLink,
    size_kb: Math.round(file.size / 1024),
    quota_warning: shouldWarn,
  })
}
