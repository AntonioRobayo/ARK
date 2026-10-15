'use client'

import { useState, useRef } from 'react'

interface Props {
  className?: string
}

export function AdImageUploader({ className }: Props) {
  const [preview, setPreview]   = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        name="image_file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required
        className="hidden"
        onChange={handleChange}
      />

      {preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-40 object-contain rounded-lg border border-gray-200 bg-gray-50"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate max-w-xs">{fileName}</span>
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                setFileName(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
              className="text-xs text-red-500 hover:text-red-600 ml-2 flex-shrink-0"
            >
              Cambiar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
        >
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
