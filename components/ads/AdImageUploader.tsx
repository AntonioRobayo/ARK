'use client'

import { useState, useRef } from 'react'

interface Props {
  className?: string
}

export function AdImageUploader({ className }: Props) {
  const [preview, setPreview]   = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setPreview(URL.createObjectURL(file))
    setUploadError(null)
    setUploading(true)
    setImageUrl(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-ad-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setImageUrl(json.url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir imagen')
      setPreview(null)
      setFileName(null)
    } finally {
      setUploading(false)
    }
  }

  function handleReset() {
    setPreview(null)
    setFileName(null)
    setImageUrl(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      {/* Hidden text input — this is what the form submits */}
      {imageUrl && <input type="hidden" name="image_url" value={imageUrl} />}

      {/* File picker — no name, not submitted with form */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />

      {uploadError && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {uploadError}
        </div>
      )}

      {preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full max-h-40 object-contain rounded-lg border border-gray-200 bg-gray-50" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate max-w-xs">
              {uploading ? (
                <span className="text-orange-500 flex items-center gap-1">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Subiendo…
                </span>
              ) : (
                fileName
              )}
            </span>
            {!uploading && (
              <button type="button" onClick={handleReset}
                className="text-xs text-red-500 hover:text-red-600 ml-2 flex-shrink-0">
                Cambiar imagen
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500 disabled:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-sm font-medium">Seleccionar imagen</span>
          <span className="text-xs">JPG, PNG, WebP o GIF · máx. 2 MB</span>
        </button>
      )}
    </div>
  )
}
