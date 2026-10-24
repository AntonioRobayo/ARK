'use client'

import { useRef } from 'react'
import { addCustomerPart } from '@/app/(dashboard)/work-orders/[id]/actions'
import { DriveUploader } from '@/components/work-orders/DriveUploader'

const CONDITION_LABEL: Record<string, string> = {
  new:     'Nuevo',
  used:    'Usado',
  damaged: 'Dañado',
}
const CONDITION_COLOR: Record<string, string> = {
  new:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  used:    'bg-amber-50 text-amber-700 border-amber-200',
  damaged: 'bg-red-50 text-red-700 border-red-200',
}

export interface CustomerPart {
  id: string
  description: string
  quantity: number
  condition: string
  notes: string | null
  created_at: string
}

interface Props {
  otId: string
  tenantId: string
  vehicleId: string
  parts: CustomerPart[]
  attachments: any[]
  driveEnabled: boolean
}

export function CustomerPartsSection({ otId, tenantId, vehicleId, parts, attachments, driveEnabled }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  const repuestosPhotos = attachments.filter(a => a.section === 'repuestos_cliente')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Repuestos del cliente</p>
        <span className="text-xs text-gray-400">{parts.length} pieza{parts.length !== 1 ? 's' : ''}</span>
      </div>

      {parts.length > 0 && (
        <div className="space-y-2 mb-4">
          {parts.map(p => (
            <div key={p.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className={`flex-shrink-0 mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded border ${CONDITION_COLOR[p.condition] ?? 'bg-gray-50 text-gray-500'}`}>
                {CONDITION_LABEL[p.condition] ?? p.condition}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  {p.description}
                  {p.quantity > 1 && <span className="text-gray-400 ml-1.5">× {p.quantity}</span>}
                </p>
                {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!parts.length && (
        <p className="text-sm text-gray-400 py-1 mb-4">Sin repuestos registrados.</p>
      )}

      {/* Fotos de repuestos del cliente */}
      {driveEnabled && (
        <div className="mb-4">
          {repuestosPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {repuestosPhotos.map((a: any) => (
                <a key={a.id} href={`https://drive.google.com/file/d/${a.drive_file_id}/view`} target="_blank" rel="noreferrer">
                  <img
                    src={a.drive_thumb_url ?? `https://drive.google.com/thumbnail?id=${a.drive_file_id}&sz=w200`}
                    alt={a.original_name}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-100"
                  />
                </a>
              ))}
            </div>
          )}
          <DriveUploader workOrderId={otId} vehicleId={vehicleId} section="repuestos_cliente" />
        </div>
      )}

      {/* Formulario agregar */}
      <form ref={formRef} action={addCustomerPart} className="border-t border-gray-100 pt-3 space-y-2">
        <input type="hidden" name="ot_id" value={otId} />
        <input type="hidden" name="tenant_id" value={tenantId} />
        <div className="flex gap-2">
          <input
            type="text"
            name="description"
            required
            placeholder="Nombre de la pieza o repuesto…"
            className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
          <input
            type="number"
            name="quantity"
            defaultValue={1}
            min={1}
            className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            name="condition"
            defaultValue="new"
            className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shrink-0"
          >
            <option value="new">Nuevo</option>
            <option value="used">Usado</option>
            <option value="damaged">Dañado</option>
          </select>
          <input
            type="text"
            name="notes"
            placeholder="Observaciones (opcional)"
            className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="w-full text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-2 rounded-lg transition-colors"
        >
          + Agregar
        </button>
      </form>
    </div>
  )
}
