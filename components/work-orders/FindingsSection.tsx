'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { addFinding, deleteFinding, updateFinding, notifyCustomerFindings } from '@/app/(dashboard)/work-orders/[id]/actions'

const SEVERITY_LABEL: Record<string, string> = {
  minor:    'Menor',
  moderate: 'Moderado',
  critical: 'Crítico',
}
const SEVERITY_COLOR: Record<string, string> = {
  minor:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  moderate: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  pending:       'Pendiente',
  notified:      'Notificado — esperando respuesta',
  approve_quote: 'Cliente aprobó cotización',
  note_only:     'Registrado como nota',
}
const STATUS_COLOR: Record<string, string> = {
  pending:       'text-gray-400',
  notified:      'text-blue-500',
  approve_quote: 'text-emerald-600 font-medium',
  note_only:     'text-purple-600',
}

export interface Finding {
  id: string
  description: string
  severity: string
  status: string
  notified_at: string | null
  customer_responded_at: string | null
}

interface Props {
  otId: string
  findings: Finding[]
  customerEmail: string | null | undefined
  customerName: string
  otNumber: string | number
  vehiclePlate: string
}

export function FindingsSection({ otId, findings, customerEmail, customerName, otNumber, vehiclePlate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editSev, setEditSev] = useState('moderate')
  const [newDesc, setNewDesc] = useState('')
  const [newSev, setNewSev] = useState('moderate')
  const [isPending, startTransition] = useTransition()

  const [optimisticFindings, addOptimistic] = useOptimistic(
    findings,
    (state: Finding[], item: Finding) => [...state, item],
  )

  const pendingCount  = optimisticFindings.filter(f => f.status === 'pending').length
  const notifiedCount = optimisticFindings.filter(f => f.status === 'notified').length
  const hasFindings   = optimisticFindings.length > 0

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const description = newDesc.trim()
    if (!description) return
    const fd = new FormData()
    fd.append('ot_id', otId)
    fd.append('description', description)
    fd.append('severity', newSev)
    setNewDesc('')
    setNewSev('moderate')
    startTransition(async () => {
      addOptimistic({ id: `temp-${Date.now()}`, description, severity: newSev, status: 'pending', notified_at: null, customer_responded_at: null })
      await addFinding(fd)
    })
  }

  const startEdit = (f: Finding) => {
    setEditingId(f.id)
    setEditDesc(f.description)
    setEditSev(f.severity)
  }

  const cancelEdit = () => setEditingId(null)

  const submitEdit = (findingId: string) => {
    const fd = new FormData()
    fd.append('finding_id', findingId)
    fd.append('ot_id', otId)
    fd.append('description', editDesc)
    fd.append('severity', editSev)
    startTransition(async () => {
      await updateFinding(fd)
      setEditingId(null)
    })
  }

  const handleDelete = (findingId: string) => {
    const fd = new FormData()
    fd.append('finding_id', findingId)
    fd.append('ot_id', otId)
    startTransition(() => { deleteFinding(fd) })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Diagnóstico / Hallazgos</p>
        {notifiedCount > 0 && (
          <span className="text-xs text-blue-500 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            📬 Notificado — esperando respuesta
          </span>
        )}
        {pendingCount > 0 && notifiedCount === 0 && customerEmail && (
          <form action={notifyCustomerFindings}>
            <input type="hidden" name="ot_id" value={otId} />
            <button
              type="submit"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              📧 Notificar al cliente ({pendingCount})
            </button>
          </form>
        )}
        {pendingCount > 0 && notifiedCount === 0 && !customerEmail && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            ⚠ Cliente sin email
          </span>
        )}
      </div>

      {/* Lista de hallazgos */}
      {hasFindings && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {optimisticFindings.map(f => {
            const isPendingFinding = f.status === 'pending'
            const isEditing = editingId === f.id

            if (isEditing) {
              return (
                <div key={f.id} className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={editSev}
                      onChange={e => setEditSev(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="minor">Menor</option>
                      <option value="moderate">Moderado</option>
                      <option value="critical">Crítico</option>
                    </select>
                    <button
                      type="button"
                      disabled={isPending || !editDesc.trim()}
                      onClick={() => submitEdit(f.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={f.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100 group">
                <span className={`flex-shrink-0 mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded border ${SEVERITY_COLOR[f.severity] ?? 'bg-gray-50 text-gray-500'}`}>
                  {SEVERITY_LABEL[f.severity] ?? f.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{f.description}</p>
                  <p className={`text-xs mt-0.5 ${STATUS_COLOR[f.status] ?? 'text-gray-400'}`}>
                    {STATUS_LABEL[f.status] ?? f.status}
                    {f.customer_responded_at && (
                      <span className="text-gray-400 font-normal">
                        {' '}· {new Date(f.customer_responded_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </p>
                </div>
                {isPendingFinding && (
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(f.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
                {!isPendingFinding && (
                  <span className="flex-shrink-0 text-gray-300 mt-0.5" title="Bloqueado — ya notificado al cliente">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!hasFindings && (
        <p className="text-sm text-gray-400 py-2 mb-4">Sin hallazgos registrados.</p>
      )}

      {/* Formulario agregar hallazgo */}
      <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            required
            placeholder="Describe el hallazgo…"
            className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
          <select
            value={newSev}
            onChange={e => setNewSev(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shrink-0"
          >
            <option value="minor">Menor</option>
            <option value="moderate">Moderado</option>
            <option value="critical">Crítico</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={!newDesc.trim() || isPending}
          className="w-full text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : '+ Agregar'}
        </button>
      </form>
    </div>
  )
}
