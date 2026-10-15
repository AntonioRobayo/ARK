'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createCampaign } from '@/app/(dashboard)/superadmin/ads/actions'

interface Placement {
  id: string
  name: string
  slug: string
  width: number
  height: number
  price_per_week: number | null
  price_per_month: number | null
}

interface Props {
  placements: Placement[]
  error?: string
  labels: {
    fieldPlacement: string
    sectionAd: string
    fieldTitle: string
    fieldImageUrl: string
    fieldImageUrlHint: string
    fieldLinkUrl: string
    fieldLinkUrlHint: string
    sectionAdvertiser: string
    fieldAdvertiserName: string
    fieldAdvertiserContact: string
    sectionBilling: string
    fieldPrice: string
    fieldStartsAt: string
    fieldEndsAt: string
    fieldNotes: string
    submitBtn: string
  }
}

export function AdCampaignForm({ placements, error, labels }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <form action={createCampaign} className="space-y-5">

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Espacio publicitario */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">{labels.fieldPlacement}</p>
        <div className="grid grid-cols-1 gap-2">
          {placements.map(p => (
            <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
              <input type="radio" name="placement_id" value={p.id} required className="accent-orange-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.width}×{p.height}px
                  {p.price_per_week && <span className="ml-2 text-orange-600">${p.price_per_week}/sem · ${p.price_per_month}/mes</span>}
                </p>
              </div>
            </label>
          ))}
          {placements.length === 0 && (
            <p className="text-sm text-gray-400 py-2">
              No hay espacios publicitarios activos.{' '}
              <Link href="/superadmin/ads/placements/new" className="text-orange-600 underline">Crear uno</Link>.
            </p>
          )}
        </div>
      </div>

      {/* Creatividad */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{labels.sectionAd}</p>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldTitle}</label>
          <input name="title" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="Banner Repuestos Toro — Oct 2026" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldImageUrl}</label>
          <input
            ref={fileInputRef}
            name="image_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="hidden"
            onChange={handleFileChange}
          />
          {preview ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full max-h-40 object-contain rounded-lg border border-gray-200 bg-gray-50" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate max-w-xs">{fileName}</span>
                <button type="button" onClick={() => { setPreview(null); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-xs text-red-500 hover:text-red-600 ml-2 flex-shrink-0">Cambiar imagen</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="text-sm font-medium">Seleccionar imagen</span>
              <span className="text-xs">JPG, PNG, WebP o GIF · máx. 2 MB</span>
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">{labels.fieldImageUrlHint}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldLinkUrl}</label>
          <input name="link_url" type="url" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="https://repuestostoro.com" />
          <p className="text-xs text-gray-400 mt-1">{labels.fieldLinkUrlHint}</p>
        </div>
      </div>

      {/* Anunciante */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{labels.sectionAdvertiser}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldAdvertiserName}</label>
            <input name="advertiser_name" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Repuestos Toro S.A.S." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldAdvertiserContact}</label>
            <input name="advertiser_contact" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="ventas@repuestostoro.com" />
          </div>
        </div>
      </div>

      {/* Precio y fechas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{labels.sectionBilling}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldPrice}</label>
            <div className="flex gap-2">
              <input name="price_paid" type="number" step="0.01" min="0" required
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="80.00" />
              <select name="currency"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="USD">USD</option>
                <option value="COP">COP</option>
                <option value="BRL">BRL</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldStartsAt}</label>
            <input name="starts_at" type="datetime-local" required defaultValue={defaultStart}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldEndsAt}</label>
            <input name="ends_at" type="datetime-local" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{labels.fieldNotes}</label>
          <textarea name="notes" rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            placeholder="Contrato firmado, pago recibido el..." />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#FF7316' }}>
          {labels.submitBtn}
        </button>
        <Link href="/superadmin/ads"
          className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
