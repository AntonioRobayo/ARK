'use client'

import { useState, useTransition } from 'react'
import { changeStatus } from '@/app/(dashboard)/work-orders/[id]/actions'
import { STATUS_LABEL } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

const REASON_STATES: WorkOrderStatus[] = [
  'cancelled',
  'blocked_parts',
  'blocked_technician',
  'blocked_customer',
  'warranty',
]

interface Props {
  otId: string
  transitions: WorkOrderStatus[]
}

export function StatusTransitionButtons({ otId, transitions }: Props) {
  const [expanded, setExpanded] = useState<WorkOrderStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  if (transitions.length === 0) return null

  const submitDirect = (toStatus: WorkOrderStatus) => {
    const fd = new FormData()
    fd.append('ot_id', otId)
    fd.append('to_status', toStatus)
    startTransition(() => { changeStatus(fd) })
  }

  const submitWithReason = (toStatus: WorkOrderStatus, reason: string) => {
    const fd = new FormData()
    fd.append('ot_id', otId)
    fd.append('to_status', toStatus)
    if (reason) fd.append('reason', reason)
    startTransition(() => { changeStatus(fd) })
  }

  return (
    <div className="flex gap-2 flex-wrap items-start">
      {transitions.map(toStatus => {
        const needsReason = REASON_STATES.includes(toStatus)
        const isCancelled = toStatus === 'cancelled'
        const isBlocked = toStatus === 'blocked_parts' || toStatus === 'blocked_technician' || toStatus === 'blocked_customer'
        const isExpanded = expanded === toStatus

        if (isExpanded) {
          return (
            <div key={toStatus} className="flex flex-col gap-1.5 min-w-[220px]">
              <textarea
                id={`reason-${toStatus}`}
                name="reason"
                rows={2}
                placeholder={
                  isCancelled
                    ? 'Ingresa el motivo para cancelar'
                    : 'Explica el motivo (opcional)'
                }
                autoFocus
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 placeholder:text-gray-300"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const textarea = document.getElementById(`reason-${toStatus}`) as HTMLTextAreaElement | null
                    const reason = textarea?.value ?? ''
                    if (isCancelled && !reason.trim()) {
                      textarea?.focus()
                      return
                    }
                    setExpanded(null)
                    submitWithReason(toStatus, reason)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                    isCancelled
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      : isBlocked
                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
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
          <button
            key={toStatus}
            type="button"
            disabled={isPending}
            onClick={() => {
              if (needsReason) {
                setExpanded(toStatus)
              } else {
                submitDirect(toStatus)
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
              isCancelled
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            → {STATUS_LABEL[toStatus]}
          </button>
        )
      })}
    </div>
  )
}
