import { createAdminClient } from '@/lib/supabase/admin'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export interface DriveFile {
  id: string
  name: string
  thumbnailLink?: string
  webViewLink?: string
  mimeType: string
}

// --- Service Account Token ---

function toBase64Url(input: ArrayBuffer | string): string {
  let bytes: Uint8Array
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input)
  } else {
    bytes = new Uint8Array(input)
  }
  let str = ''
  bytes.forEach(b => { str += String.fromCharCode(b) })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function getServiceAccountToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const pemRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !pemRaw) throw new Error('Google service account not configured')

  const pem = pemRaw.replace(/\\n/g, '\n')
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const keyBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const now = Math.floor(Date.now() / 1000)
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = toBase64Url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const signingInput = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const jwt = `${signingInput}.${toBase64Url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Service account auth failed: ${err}`)
  }

  const json = await res.json()
  return json.access_token as string
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
