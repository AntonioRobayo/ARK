import { addFinding, notifyCustomerFindings } from '@/app/(dashboard)/work-orders/[id]/actions'

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
  const pendingCount  = findings.filter(f => f.status === 'pending').length
  const notifiedCount = findings.filter(f => f.status === 'notified').length
  const hasFindings   = findings.length > 0

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
        <div className="space-y-2 mb-4">
          {findings.map(f => (
            <div key={f.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
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
            </div>
          ))}
        </div>
      )}

      {!hasFindings && (
        <p className="text-sm text-gray-400 py-2 mb-4">Sin hallazgos registrados.</p>
      )}

      {/* Formulario agregar hallazgo */}
      <form action={addFinding} className="flex gap-2 items-end border-t border-gray-100 pt-3">
        <input type="hidden" name="ot_id" value={otId} />
        <div className="flex-1">
          <input
            type="text"
            name="description"
            required
            placeholder="Describe el hallazgo…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>
        <select
          name="severity"
          defaultValue="moderate"
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
        >
          <option value="minor">Menor</option>
          <option value="moderate">Moderado</option>
          <option value="critical">Crítico</option>
        </select>
        <button
          type="submit"
          className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Agregar
        </button>
      </form>
    </div>
  )
}
