'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { startTimer, stopTimer } from '@/app/(dashboard)/work-orders/[id]/time-actions'

type TimeEntry = {
  id: string
  technician_id: string
  started_at: string
  ended_at: string | null
  minutes: number | null
  notes: string | null
}

type Props = {
  otId: string
  currentUserId: string
  timeEntries: TimeEntry[]
  totalMinutes: number
}

function formatMinutes(m: number): string {
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}h ${mm}m ${ss}s` : `${mm}m ${ss}s`
}

export function TimeTracker({ otId, currentUserId, timeEntries, totalMinutes }: Props) {
  const t = useTranslations('workOrders')
  const [isPending, startTransition] = useTransition()
  const [elapsed, setElapsed] = useState(0)
  const [notes, setNotes] = useState('')

  const activeEntry = timeEntries.find(
    (e) => e.ended_at === null && e.technician_id === currentUserId
  ) ?? null

  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0)
      return
    }
    const start = new Date(activeEntry.started_at).getTime()
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeEntry?.id, activeEntry?.started_at])

  function handleStart() {
    startTransition(async () => {
      await startTimer(otId)
    })
  }

  function handleStop() {
    if (!activeEntry) return
    startTransition(async () => {
      await stopTimer(activeEntry.id, otId, notes || undefined)
      setNotes('')
    })
  }

  return (
    <div className="space-y-3">
      {activeEntry ? (
        <div className="space-y-2">
          <div
            className="text-xl font-mono font-bold tabular-nums"
            style={{ color: '#FF7316' }}
          >
            {formatElapsed(elapsed)}
          </div>
          <span className="inline-block text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
            {t('time.active')}
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('time.notes')}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
          <button
            onClick={handleStop}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('time.stop')}
          </button>
        </div>
      ) : (
        <button
          onClick={handleStart}
          disabled={isPending}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {t('time.start')}
        </button>
      )}

      {timeEntries.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{t('time.noEntries')}</p>
      ) : (
        <div className="space-y-1.5 pt-1">
          {timeEntries.map((entry) => {
            const isMe = entry.technician_id === currentUserId
            const isCurrent = entry.ended_at === null
            const duration = isCurrent
              ? null
              : entry.minutes != null
              ? formatMinutes(entry.minutes)
              : null
            const startTime = new Date(entry.started_at).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })
            return (
              <div key={entry.id} className="flex items-center gap-2 text-xs text-gray-500">
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCurrent ? 'bg-orange-400' : 'bg-gray-300'
                  }`}
                />
                <span className="font-mono text-gray-400">{startTime}</span>
                <span className="font-medium text-gray-600">
                  {isMe ? 'Tú' : entry.technician_id.slice(0, 4).toUpperCase()}
                </span>
                {duration && <span className="text-gray-400">{duration}</span>}
                {entry.notes && (
                  <span className="text-gray-300 truncate max-w-[100px]">{entry.notes}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalMinutes > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500">
            {t('time.total')}: <span className="font-bold text-gray-700">{formatMinutes(totalMinutes)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
