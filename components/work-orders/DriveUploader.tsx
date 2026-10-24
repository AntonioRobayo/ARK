'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UploadedFile {
  id: string
  name: string
  thumbUrl: string
  webViewLink: string
  sizeKb: number
}

interface Props {
  workOrderId: string
  vehicleId: string
  section: string
  onUploaded?: (file: UploadedFile) => void
  disabled?: boolean
}

const COMPRESSION_CONFIG: Record<string, { maxW: number; maxH: number; quality: number }> = {
  recepcion:   { maxW: 1920, maxH: 1080, quality: 0.82 },
  diagnostico: { maxW: 1280, maxH: 960,  quality: 0.80 },
  trabajo:     { maxW: 1280, maxH: 960,  quality: 0.80 },
  repuestos:   { maxW: 1280, maxH: 960,  quality: 0.80 },
  entrega:     { maxW: 1920, maxH: 1080, quality: 0.85 },
  custodia:    { maxW: 1280, maxH: 960,  quality: 0.80 },
}

const VIDEO_WARN_BYTES = 50 * 1024 * 1024

async function compressImage(file: File, maxW: number, maxH: number, quality: number): Promise<File> {
  if (typeof OffscreenCanvas === 'undefined') return file
  const img = await createImageBitmap(file)
  const scale = Math.min(1, maxW / img.width, maxH / img.height)
  const canvas = new OffscreenCanvas(Math.round(img.width * scale), Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

interface StagedFile {
  file: File
  preview: string | null
}

interface FileState {
  name: string
  status: 'compressing' | 'uploading' | 'done' | 'error'
  error?: string
  result?: UploadedFile
}

export function DriveUploader({ workOrderId, vehicleId, section, onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged]           = useState<StagedFile[]>([])
  const [uploading, setUploading]     = useState<FileState[]>([])
  const [quotaWarning, setQuotaWarning] = useState(false)
  const router = useRouter()

  // Clear state when section changes so stale uploads don't bleed across tabs
  useEffect(() => {
    setStaged([])
    setUploading([])
    setQuotaWarning(false)
  }, [section])

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      staged.forEach(s => { if (s.preview) URL.revokeObjectURL(s.preview) })
    }
  }, [staged])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return

    const newStaged: StagedFile[] = selected.map(f => ({
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }))
    setStaged(prev => [...prev, ...newStaged])
    e.target.value = ''
  }

  function removeStaged(index: number) {
    setStaged(prev => {
      const item = prev[index]
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateFile = useCallback((index: number, patch: Partial<FileState>) => {
    setUploading(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
  }, [])

  async function processFile(rawFile: File, index: number) {
    const isImage = rawFile.type.startsWith('image/')
    const isVideo = rawFile.type.startsWith('video/')

    if (isVideo && rawFile.size > VIDEO_WARN_BYTES) {
      if (!confirm(`El video "${rawFile.name}" pesa ${(rawFile.size / (1024 * 1024)).toFixed(0)} MB. ¿Continuar?`)) {
        updateFile(index, { status: 'error', error: 'Cancelado' })
        return
      }
    }

    let fileToUpload = rawFile
    if (isImage) {
      updateFile(index, { status: 'compressing' })
      const cfg = COMPRESSION_CONFIG[section] ?? COMPRESSION_CONFIG.trabajo
      fileToUpload = await compressImage(rawFile, cfg.maxW, cfg.maxH, cfg.quality)
    }

    updateFile(index, { status: 'uploading' })

    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('work_order_id', workOrderId)
    formData.append('vehicle_id', vehicleId)
    formData.append('section', section)

    const res = await fetch('/api/drive/upload', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      const msg =
        json.error === 'drive_quota_exceeded' ? 'Sin espacio en Drive' :
        json.error === 'drive_token_error'    ? 'Error de autenticación con Drive' :
        json.error ?? 'Error desconocido'
      updateFile(index, { status: 'error', error: msg })
      return
    }

    if (json.quota_warning) setQuotaWarning(true)

    const uploaded: UploadedFile = {
      id: json.id, name: rawFile.name,
      thumbUrl: json.thumb_url, webViewLink: json.web_view_link, sizeKb: json.size_kb,
    }
    updateFile(index, { status: 'done', result: uploaded })
    onUploaded?.(uploaded)
    router.refresh()
  }

  function startUpload() {
    if (!staged.length) return
    const states: FileState[] = staged.map(s => ({ name: s.file.name, status: 'compressing' }))
    const files = staged.map(s => s.file)

    // Revoke previews
    staged.forEach(s => { if (s.preview) URL.revokeObjectURL(s.preview) })
    setStaged([])

    setUploading(prev => {
      const offset = prev.length
      files.forEach((f, i) => processFile(f, offset + i))
      return [...prev, ...states]
    })
  }

  const pending = uploading.filter(f => f.status !== 'done' && f.status !== 'error')

  return (
    <div className="space-y-2">
      {quotaWarning && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ El espacio de Drive está por debajo de 500 MB. Considera liberar espacio.
        </div>
      )}

      {/* Staged files — preview grid with remove buttons */}
      {staged.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div key={i} className="relative group">
                {s.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.preview}
                    alt={s.file.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <span className="text-xl">📄</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeStaged(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow transition-colors"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startUpload}
              disabled={!!disabled}
              className="flex-1 text-sm font-medium bg-slate-700 hover:bg-slate-800 text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            >
              Subir {staged.length} {staged.length === 1 ? 'archivo' : 'archivos'}
            </button>
            <button
              type="button"
              onClick={() => setStaged([])}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Upload progress list */}
      {uploading.length > 0 && (
        <div className="space-y-1.5">
          {uploading.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                f.status === 'done'  ? 'bg-emerald-400' :
                f.status === 'error' ? 'bg-red-400' :
                'bg-amber-400 animate-pulse'
              }`} />
              <span className="truncate text-gray-500 max-w-48">{f.name}</span>
              <span className="text-gray-300 ml-auto flex-shrink-0">
                {f.status === 'compressing' && 'Comprimiendo…'}
                {f.status === 'uploading'   && 'Subiendo…'}
                {f.status === 'done'   && f.result && `${f.result.sizeKb} KB`}
                {f.status === 'error'  && <span className="text-red-400">{f.error}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload button — hidden while staging */}
      {staged.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || pending.length > 0}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Subir fotos / videos
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
