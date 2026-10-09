'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createWorkOrder } from './actions'

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

interface Props {
  customerId: string
  vehicleId: string
  appointmentId: string | null
  currentMileage: number | null
  techs: Tech[]
  checklist: ChecklistTemplate | null
}

type ChecklistStatus = 'ok' | 'issue' | 'na'

export function ReceptionForm({ customerId, vehicleId, appointmentId, currentMileage, techs, checklist }: Props) {
  const t = useTranslations('workOrders')

  const [custodyItems, setCustodyItems] = useState<{ description: string; location: string }[]>([])
  const [checklistResponses, setChecklistResponses] = useState<Record<string, ChecklistStatus>>({})

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

  const custodyJson = JSON.stringify(custodyItems.filter(i => i.description.trim()))
  const checklistJson = checklist
    ? JSON.stringify({ templateId: checklist.id, responses: checklistResponses })
    : JSON.stringify(null)

  return (
    <form action={createWorkOrder} className="space-y-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      {appointmentId && <input type="hidden" name="appointment_id" value={appointmentId} />}
      <input type="hidden" name="custody_items" value={custodyJson} />
      <input type="hidden" name="checklist_data" value={checklistJson} />

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
          <input
            name="fuel_level"
            type="number"
            min="0" max="8"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="0–8"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.battery')}</label>
          <input
            name="battery_level"
            type="number"
            min="0" max="10"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="0–10"
          />
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
        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors"
      >
        {t('new.create')}
      </button>
    </form>
  )
}
