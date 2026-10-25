'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createWorkOrder } from './actions'

async function compressImage(file: File, maxW: number, maxH: number, quality: number): Promise<File> {
  if (!file.type.startsWith('image/') || typeof OffscreenCanvas === 'undefined') return file
  try {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, maxW / img.width, maxH / img.height)
    const canvas = new OffscreenCanvas(Math.round(img.width * scale), Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

interface ChecklistItem {
  id: string
  label: string
  is_required: boolean
  order_index: number
}

interface ChecklistTemplate {
  id: string
  name: string
  items: ChecklistItem[]
}

interface Tech {
  id: string
  first_name: string
  last_name: string
}

interface FuelOption { value: string; label: string }
interface Branch { id: string; name: string }

interface CustomerPart {
  description: string
  quantity: number
  condition: string
  notes: string
}

interface Props {
  customerId: string
  vehicleId: string
  appointmentId: string | null
  currentMileage: number | null
  techs: Tech[]
  checklist: ChecklistTemplate | null
  fuelLevelOptions: FuelOption[]
  branches: Branch[]
}

type ChecklistStatus = 'ok' | 'issue' | 'na'

const CONDITION_OPTIONS = [
  { value: 'new',     label: 'Nuevo' },
  { value: 'used',    label: 'Usado' },
  { value: 'damaged', label: 'Dañado' },
]

export function ReceptionForm({ customerId, vehicleId, appointmentId, currentMileage, techs, checklist, fuelLevelOptions, branches }: Props) {
  const t = useTranslations('workOrders')

  const [isPending, startTransition] = useTransition()
  const [isCompressing, setIsCompressing] = useState(false)

  const [custodyItems, setCustodyItems] = useState<{ description: string; location: string }[]>([])
  const [checklistResponses, setChecklistResponses] = useState<Record<string, ChecklistStatus>>({})
  const [customerParts, setCustomerParts] = useState<CustomerPart[]>([])
  const [photoCount, setPhotoCount]               = useState(0)
  const [partsPhotoCount, setPartsPhotoCount]     = useState(0)
  const [custodyPhotoCount, setCustodyPhotoCount] = useState(0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsCompressing(true)

    const original = new FormData(e.currentTarget)
    const newFd    = new FormData()

    // Copy all non-file fields as-is
    for (const [key, val] of original.entries()) {
      if (!(val instanceof File)) newFd.append(key, val)
    }

    // Compress each photo batch before sending
    for (const fieldName of ['reception_photos', 'repuestos_photos', 'custodia_photos']) {
      for (const f of original.getAll(fieldName)) {
        if (f instanceof File && f.size > 0) {
          const compressed = await compressImage(f, 1920, 1080, 0.82)
          newFd.append(fieldName, compressed)
        }
      }
    }

    setIsCompressing(false)
    startTransition(async () => { await createWorkOrder(newFd) })
  }

  const addCustodyItem = () => {
    setCustodyItems(prev => [...prev, { description: '', location: '' }])
  }

  const removeCustodyItem = (index: number) => {
    setCustodyItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateCustodyItem = (index: number, field: 'description' | 'location', value: string) => {
    setCustodyItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const setChecklistItem = (itemId: string, status: ChecklistStatus) => {
    setChecklistResponses(prev => ({ ...prev, [itemId]: status }))
  }

  const addCustomerPart = () => setCustomerParts(prev => [...prev, { description: '', quantity: 1, condition: 'new', notes: '' }])
  const removeCustomerPart = (i: number) => setCustomerParts(prev => prev.filter((_, idx) => idx !== i))
  const updateCustomerPart = (i: number, field: keyof CustomerPart, value: string | number) =>
    setCustomerParts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))

  const custodyJson = JSON.stringify(custodyItems.filter(i => i.description.trim()))
  const checklistJson = checklist
    ? JSON.stringify({ templateId: checklist.id, responses: checklistResponses })
    : JSON.stringify(null)
  const customerPartsJson = JSON.stringify(customerParts.filter(p => p.description.trim()))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      {appointmentId && <input type="hidden" name="appointment_id" value={appointmentId} />}
      <input type="hidden" name="custody_items" value={custodyJson} />
      <input type="hidden" name="checklist_data" value={checklistJson} />
      <input type="hidden" name="customer_parts_data" value={customerPartsJson} />
      {branches.length === 1 && <input type="hidden" name="branch_id" value={branches[0].id} />}

      {branches.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
          <select
            name="branch_id"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          >
            <option value="">— Seleccionar sede —</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.km')}</label>
          <input
            name="reception_mileage"
            type="number"
            min="0"
            defaultValue={currentMileage ?? ''}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="ej. 12500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.priority')}</label>
          <select
            name="priority"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          >
            <option value="normal">{t('priority.normal')}</option>
            <option value="high">{t('priority.high')}</option>
            <option value="urgent">{t('priority.urgent')}</option>
            <option value="low">{t('priority.low')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.fuel')}</label>
          <select
            name="fuel_level"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Sin registrar —</option>
            {fuelLevelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.technician')}</label>
          <select
            name="technician_id"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          >
            <option value="">{t('unassigned')}</option>
            {techs.map(tech => (
              <option key={tech.id} value={tech.id}>{tech.first_name} {tech.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.estimatedDelivery')}</label>
          <input
            name="estimated_delivery_at"
            type="datetime-local"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.observations')}</label>
        <textarea
          name="reception_notes"
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder={t('new.observationsPlaceholder')}
        />
      </div>

      {/* Fotos de recepción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Fotos de recepción
          <span className="ml-1.5 text-xs font-normal text-gray-400">Se incluirán en el correo al cliente</span>
        </label>
        <label className="flex items-center gap-3 w-full px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-colors">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-500">
            {photoCount > 0
              ? <span className="font-medium text-slate-700">{photoCount} foto{photoCount !== 1 ? 's' : ''} seleccionada{photoCount !== 1 ? 's' : ''}</span>
              : 'Tomar foto o seleccionar del dispositivo'}
          </span>
          <input type="file" name="reception_photos" multiple accept="image/*,video/*" capture="environment" className="sr-only" onChange={e => setPhotoCount(e.target.files?.length ?? 0)} />
        </label>
      </div>

      {/* Repuestos del cliente */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Repuestos del cliente</h3>
          <button
            type="button"
            onClick={addCustomerPart}
            className="text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded px-2 py-1 transition-colors"
          >
            + Agregar repuesto
          </button>
        </div>
        {customerParts.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin repuestos registrados.</p>
        ) : (
          <div className="space-y-2">
            {customerParts.map((part, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                <input
                  type="text"
                  value={part.description}
                  onChange={e => updateCustomerPart(i, 'description', e.target.value)}
                  placeholder="Descripción del repuesto"
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="number"
                  value={part.quantity}
                  min={1}
                  onChange={e => updateCustomerPart(i, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                />
                <select
                  value={part.condition}
                  onChange={e => updateCustomerPart(i, 'condition', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {CONDITION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeCustomerPart(i)}
                  className="text-red-400 hover:text-red-600 text-sm w-6 h-6 flex items-center justify-center mt-0.5"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fotos de repuestos */}
        <div className="mt-3">
          <label className="flex items-center gap-3 w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-500">
              {partsPhotoCount > 0
                ? <span className="font-medium text-slate-700">{partsPhotoCount} foto{partsPhotoCount !== 1 ? 's' : ''} de repuestos</span>
                : 'Fotos de los repuestos'}
            </span>
            <input type="file" name="repuestos_photos" multiple accept="image/*,video/*" capture="environment" className="sr-only" onChange={e => setPartsPhotoCount(e.target.files?.length ?? 0)} />
          </label>
        </div>
      </div>

      {/* Objetos en custodia */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{t('new.custodyTitle')}</h3>
          <button
            type="button"
            onClick={addCustodyItem}
            className="text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded px-2 py-1 transition-colors"
          >
            {t('new.custodyAdd')}
          </button>
        </div>
        {custodyItems.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{t('new.custodyEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {custodyItems.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => updateCustodyItem(i, 'description', e.target.value)}
                  placeholder={t('new.custodyDescPlaceholder')}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="text"
                  value={item.location}
                  onChange={e => updateCustodyItem(i, 'location', e.target.value)}
                  placeholder={t('new.custodyLocPlaceholder')}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => removeCustodyItem(i)}
                  className="text-red-400 hover:text-red-600 text-sm w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fotos de custodia */}
        <div className="mt-3">
          <label className="flex items-center gap-3 w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-500">
              {custodyPhotoCount > 0
                ? <span className="font-medium text-slate-700">{custodyPhotoCount} foto{custodyPhotoCount !== 1 ? 's' : ''} de objetos en custodia</span>
                : 'Fotos de los objetos en custodia'}
            </span>
            <input type="file" name="custodia_photos" multiple accept="image/*,video/*" capture="environment" className="sr-only" onChange={e => setCustodyPhotoCount(e.target.files?.length ?? 0)} />
          </label>
        </div>
      </div>

      {/* Checklist de recepción */}
      {checklist && checklist.items.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{checklist.name}</h3>
          <div className="space-y-2">
            {checklist.items.map(item => {
              const status = checklistResponses[item.id]
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1">
                    {item.label}
                    {item.is_required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {(['ok', 'issue', 'na'] as ChecklistStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setChecklistItem(item.id, s)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          status === s
                            ? s === 'ok'
                              ? 'bg-green-600 text-white border-green-600'
                              : s === 'issue'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-gray-400 text-white border-gray-400'
                            : 'border-gray-300 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {s === 'ok' ? t('new.checkOk') : s === 'issue' ? t('new.checkIssue') : t('new.checkNa')}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isCompressing || isPending}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isCompressing ? 'Comprimiendo fotos…' : isPending ? 'Creando orden…' : t('new.create')}
      </button>
    </form>
  )
}
