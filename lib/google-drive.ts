import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const QUOTA_WARN_BYTES = 500 * 1024 * 1024   // 500 MB
export const QUOTA_BLOCK_BYTES = 100 * 1024 * 1024  // 100 MB

export interface DriveQuota {
  total: number
  used: number
  available: number
}

export interface DriveFile {
  id: string
  name: string
  thumbnailLink?: string
  webViewLink?: string
  mimeType: string
}

// --- Token management ---

export async function getAccessToken(tenantId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('gdrive_refresh_token')
    .eq('id', tenantId)
    .single()

  if (!tenant?.gdrive_refresh_token) throw new Error('Google Drive not connected')

  const refreshToken = decrypt(tenant.gdrive_refresh_token)

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to refresh Google token: ${err}`)
  }

  const json = await res.json()
  return json.access_token as string
}

// --- Quota ---

export async function checkQuota(accessToken: string): Promise<DriveQuota> {
  const res = await fetch(`${DRIVE_API}/about?fields=storageQuota`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to check Drive quota')
  const { storageQuota } = await res.json()
  const total = Number(storageQuota.limit ?? 0)
  const used = Number(storageQuota.usage ?? 0)
  return { total, used, available: total - used }
}

// --- Folder management ---

export async function getOrCreateFolder(
  accessToken: string,
  parentId: string,
  name: string,
  publicViewer = false,
): Promise<string> {
  const safeQ = name.replace(/'/g, "\\'")
  const q = encodeURIComponent(
    `name='${safeQ}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const searchRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (searchRes.ok) {
    const { files } = await searchRes.json()
    if (files?.length > 0) return files[0].id as string
  }

  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  if (!createRes.ok) throw new Error(`Failed to create folder "${name}"`)
  const folder = await createRes.json()

  if (publicViewer) {
    await fetch(`${DRIVE_API}/files/${folder.id}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {})
  }

  return folder.id as string
}

// Section names in Spanish for folder naming
export const SECTION_NAMES: Record<string, string> = {
  recepcion: 'Recepción',
  diagnostico: 'Diagnóstico',
  trabajo: 'Trabajo',
  repuestos: 'Repuestos',
  entrega: 'Entrega',
  custodia: 'Custodia',
  documentos: 'Documentos',
}

// Resolve or create the folder for a specific OT section, caching in DB
export async function getOtSectionFolder(params: {
  accessToken: string
  tenantId: string
  tenantName: string
  vehicleId: string
  vehiclePlate: string
  vehicleName: string
  otId: string
  otNumber: number
  section: string
}): Promise<string> {
  const {
    accessToken, tenantId, tenantName, vehicleId, vehiclePlate, vehicleName,
    otId, otNumber, section,
  } = params

  const admin = createAdminClient()

  // Load tenant root folder ID
  const { data: tenant } = await admin
    .from('tenants')
    .select('gdrive_root_folder_id')
    .eq('id', tenantId)
    .single()
  if (!tenant?.gdrive_root_folder_id) throw new Error('Drive root folder not configured')
  const tenantRootId = tenant.gdrive_root_folder_id

  // Load or create vehicle folder cache
  const { data: cache } = await admin
    .from('vehicle_drive_folders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .maybeSingle()

  let rootFolderId = cache?.root_folder_id
  const otFolderMap: Record<string, Record<string, string>> = cache?.ot_folder_map ?? {}

  // Non-OT sections (recepcion, custodia, documentos) go directly under vehicle root
  const isDirectSection = ['recepcion', 'custodia', 'documentos'].includes(section)

  // Ensure vehicle root folder exists
  if (!rootFolderId) {
    const vehiclesFolder = await getOrCreateFolder(accessToken, tenantRootId, 'Vehículos')
    const vehicleLabel = `${vehiclePlate}${vehicleName ? ' — ' + vehicleName : ''}`
    rootFolderId = await getOrCreateFolder(accessToken, vehiclesFolder, vehicleLabel, true)
  }

  // Sections directly under vehicle
  if (section === 'recepcion') {
    let recId = cache?.reception_folder_id
    if (!recId) {
      recId = await getOrCreateFolder(accessToken, rootFolderId, 'Recepción', true)
      await admin
        .from('vehicle_drive_folders')
        .upsert({ tenant_id: tenantId, vehicle_id: vehicleId, root_folder_id: rootFolderId, reception_folder_id: recId, ot_folder_map: otFolderMap }, { onConflict: 'tenant_id,vehicle_id' })
    }
    return recId
  }

  if (section === 'custodia') {
    let custId = cache?.custodia_folder_id
    if (!custId) {
      custId = await getOrCreateFolder(accessToken, rootFolderId, 'Custodia', true)
      await admin
        .from('vehicle_drive_folders')
        .upsert({ tenant_id: tenantId, vehicle_id: vehicleId, root_folder_id: rootFolderId, custodia_folder_id: custId, ot_folder_map: otFolderMap }, { onConflict: 'tenant_id,vehicle_id' })
    }
    return custId
  }

  if (section === 'documentos') {
    let docsId = cache?.documents_folder_id
    if (!docsId) {
      docsId = await getOrCreateFolder(accessToken, rootFolderId, 'Documentos') // private
      await admin
        .from('vehicle_drive_folders')
        .upsert({ tenant_id: tenantId, vehicle_id: vehicleId, root_folder_id: rootFolderId, documents_folder_id: docsId, ot_folder_map: otFolderMap }, { onConflict: 'tenant_id,vehicle_id' })
    }
    return docsId
  }

  // OT sub-sections
  const otKey = otId
  const sectionFolderName = SECTION_NAMES[section] ?? section

  if (!otFolderMap[otKey]) otFolderMap[otKey] = {}
  if (!otFolderMap[otKey][section]) {
    // Ensure OTs parent folder exists
    if (!otFolderMap[otKey].__parent) {
      let otsParent = cache?.ot_folder_map?.[otKey]?.__parent
      if (!otsParent) {
        const otsFolderParent = await getOrCreateFolder(accessToken, rootFolderId, 'OTs')
        otsParent = await getOrCreateFolder(accessToken, otsFolderParent, `OT-${String(otNumber).padStart(4, '0')}`, true)
        otFolderMap[otKey].__parent = otsParent
      }
    }
    const sectionId = await getOrCreateFolder(accessToken, otFolderMap[otKey].__parent, sectionFolderName, true)
    otFolderMap[otKey][section] = sectionId
  }

  // Persist cache
  await admin
    .from('vehicle_drive_folders')
    .upsert({
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      root_folder_id: rootFolderId,
      ot_folder_map: otFolderMap,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,vehicle_id' })

  return otFolderMap[otKey][section]
}

// --- File upload ---

export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileBuffer: ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<DriveFile> {
  const metadata = JSON.stringify({ name: filename, parents: [folderId] })
  const body = new FormData()
  body.append('metadata', new Blob([metadata], { type: 'application/json' }))
  body.append('file', new Blob([fileBuffer], { type: mimeType }))

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,thumbnailLink,webViewLink,mimeType`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Drive upload failed: ${err}`)
  }

  return res.json()
}

// Thumbnail URL that works without auth when folder is public-viewer
export function driveThumbnailUrl(fileId: string, size = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
}
