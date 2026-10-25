'use client'

import { useState, useTransition } from 'react'
import { changeStatus } from '@/app/(dashboard)/work-orders/[id]/actions'
import { STATUS_LABEL } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

const BLOCKED_STATES: WorkOrderStatus[] = ['blocked_parts', 'blocked_technician', 'blocked_customer']
const REASON_STATES: WorkOrderStatus[] = ['cancelled', 'blocked_parts', 'blocked_technician', 'blocked_customer', 'warranty']

// Context shown to the user based on current status
const CONTEXT: Partial<Record<WorkOrderStatus, { message: string; detail: string }>> = {
  received:               { message: 'Vehículo recibido en el taller', detail: 'Cuando el técnico inicie la inspección, avanza al diagnóstico.' },
  in_diagnosis:           { message: 'En diagnóstico', detail: 'Registra los hallazgos y la cotización. Cuando el cliente autorice, avanza.' },
  quotation_sent:         { message: 'Cotización enviada al cliente', detail: 'Esperando respuesta del cliente. Puedes marcar como autorizado cuando confirme.' },
  awaiting_authorization: { message: 'Esperando autorización del cliente', detail: 'El cliente está revisando la propuesta.' },
  authorized:             { message: '¡Trabajo aprobado!', detail: 'El cliente aprobó la cotización. Inicia la reparación cuando estés listo.' },
  in_execution:           { message: 'En reparación', detail: 'Cuando termines el trabajo, pasa a control de calidad.' },
  blocked_parts:          { message: 'Bloqueado — esperando repuestos', detail: 'La OT está pausada. Reanuda cuando los repuestos estén disponibles.' },
  blocked_technician:     { message: 'Bloqueado — sin técnico disponible', detail: 'La OT está pausada. Reanuda cuando haya un técnico libre.' },
  blocked_customer:       { message: 'Bloqueado — esperando al cliente', detail: 'La OT está pausada esperando una decisión del cliente.' },
  quality_control:        { message: 'Control de calidad', detail: 'Verifica que el trabajo esté correcto antes de notificar al cliente.' },
  ready_for_delivery:     { message: 'Listo para entrega', detail: 'Coordina la entrega con el cliente. Cierra la orden cuando retiren el vehículo.' },
  delivered_with_balance: { message: 'Entregado con saldo pendiente', detail: 'El vehículo fue entregado. Hay un cobro pendiente.' },
  closed:                 { message: 'Orden cerrada', detail: 'Si hay trabajo en garantía, puedes abrirla desde aquí.' },
  warranty:               { message: 'En garantía', detail: 'Trabajando en la garantía del servicio anterior.' },
}

// The "primary" next step for each status (the big CTA button)
const PRIMARY_FOR: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  received:               'in_diagnosis',
  in_diagnosis:           'authorized',
  quotation_sent:         'awaiting_authorization',
  awaiting_authorization: 'authorized',
  authorized:             'in_execution',
  in_execution:           'quality_control',
  blocked_parts:          'in_execution',
  blocked_technician:     'in_execution',
  blocked_customer:       'in_execution',
  quality_control:        'ready_for_delivery',
  ready_for_delivery:     'closed',
  delivered_with_balance: 'closed',
  closed:                 'warranty',
  warranty:               'in_execution',
}

// Human-friendly action labels for each destination
const ACTION_LABEL: Partial<Record<WorkOrderStatus, string>> = {
  in_diagnosis:           'Iniciar diagnóstico',
  quotation_sent:         'Notificar cotización al cliente',
  awaiting_authorization: 'Poner en espera de autorización',
  authorized:             'Marcar como trabajo aprobado',
  in_execution:           'Iniciar reparación',
  quality_control:        'Pasar a control de calidad',
  ready_for_delivery:     'Marcar como listo para entrega',
  delivered_with_balance: 'Registrar entrega con saldo pendiente',
  closed:                 'Cerrar orden',
  warranty:               'Abrir garantía',
}

interface Props {
  otId: string
  currentStatus: WorkOrderStatus
  transitions: WorkOrderStatus[]
}

export function StatusTransitionButtons({ otId, currentStatus, transitions }: Props) {
  const [showBlocked, setShowBlocked] = useState(false)
  const [expanded, setExpanded] = useState<WorkOrderStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  if (transitions.length === 0) return null

  const ctx = CONTEXT[currentStatus]
  const primaryTarget = PRIMARY_FOR[currentStatus]

  const cancelTransitions = transitions.filter(t => t === 'cancelled')
  const blockedTransitions = transitions.filter(t => BLOCKED_STATES.includes(t))
  const forwardTransitions = transitions.filter(t => t !== 'cancelled' && !BLOCKED_STATES.includes(t))

  const primaryTransition = forwardTransitions.find(t => t === primaryTarget) ?? forwardTransitions[0] ?? null
  const secondaryForward = forwardTransitions.filter(t => t !== primaryTransition)

  const submit = (toStatus: WorkOrderStatus, reason = '') => {
    const fd = new FormData()
    fd.append('ot_id', otId)
    fd.append('to_status', toStatus)
    if (reason) fd.append('reason', reason)
    startTransition(() => { changeStatus(fd) })
  }

  const handleClick = (toStatus: WorkOrderStatus) => {
    if (REASON_STATES.includes(toStatus)) {
      setExpanded(toStatus)
    } else {
      submit(toStatus)
    }
  }

  // Inline helper — NOT a component, avoids remount on re-render (which would clear the textarea)
  const reasonForm = (toStatus: WorkOrderStatus, colorClass: string) => {
    const isCancelled = toStatus === 'cancelled'
    return (
      <div className="flex flex-col gap-2">
        <textarea
          id={`reason-${toStatus}`}
          rows={2}
          placeholder={isCancelled ? 'Motivo de cancelación (requerido)' : 'Explica el motivo (opcional)'}
          autoFocus
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 placeholder:text-gray-300"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const el = document.getElementById(`reason-${toStatus}`) as HTMLTextAreaElement | null
              const reason = el?.value ?? ''
              if (isCancelled && !reason.trim()) { el?.focus(); return }
              setExpanded(null)
              submit(toStatus, reason)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${colorClass}`}
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setExpanded(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      {/* Context */}
      {ctx && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-800">{ctx.message}</p>
          <p className="text-xs text-gray-400 mt-0.5">{ctx.detail}</p>
        </div>
      )}

      {/* Primary action */}
      {primaryTransition && (
        <div className="mb-2">
          {expanded === primaryTransition ? (
            reasonForm(primaryTransition, 'bg-slate-800 border-slate-800 text-white hover:bg-slate-700')
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleClick(primaryTransition)}
              className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? 'Procesando…' : `${ACTION_LABEL[primaryTransition] ?? STATUS_LABEL[primaryTransition]} →`}
            </button>
          )}
        </div>
      )}

      {/* Secondary forward transitions */}
      {secondaryForward.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {secondaryForward.map(t => (
            expanded === t ? (
              <div key={t} className="w-full">
                {reasonForm(t, 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200')}
              </div>
            ) : (
              <button
                key={t}
                type="button"
                disabled={isPending}
                onClick={() => handleClick(t)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                → {ACTION_LABEL[t] ?? STATUS_LABEL[t]}
              </button>
            )
          ))}
        </div>
      )}

      {/* Blocked states — collapsible */}
      {blockedTransitions.length > 0 && (
        <div className="pt-3 border-t border-gray-100 mt-2">
          <button
            type="button"
            onClick={() => setShowBlocked(b => !b)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
          >
            <span className="text-gray-300">{showBlocked ? '▲' : '▼'}</span>
            Reportar bloqueo
          </button>
          {showBlocked && (
            <div className="flex flex-wrap gap-2 mt-2">
              {blockedTransitions.map(t => (
                expanded === t ? (
                  <div key={t} className="w-full">
                    {reasonForm(t, 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100')}
                  </div>
                ) : (
                  <button
                    key={t}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleClick(t)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    ⚠ {STATUS_LABEL[t]}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel — always visible but subtle */}
      {cancelTransitions.length > 0 && (
        <div className="pt-3 border-t border-gray-100 mt-2">
          {expanded === 'cancelled' ? (
            reasonForm('cancelled', 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100')
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleClick('cancelled')}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
            >
              ✕ Cancelar orden
            </button>
          )}
        </div>
      )}
    </div>
  )
}
