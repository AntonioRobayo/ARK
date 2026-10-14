import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { approveQuote, rejectQuote } from './actions'
import type { QuotationStatus } from '@/types/database'

interface QuotationItemRow {
  id: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  item_type: string
  discount_pct: number | null
}

interface QuotationRow {
  id: string
  number: string
  status: QuotationStatus
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  notes: string | null
  quotation_item: QuotationItemRow[]
  work_order: {
    vehicle: { plate: string | null; brand: string; model: string } | null
    tenant: { name: string } | null
  } | null
}

function fmtCurrency(val: number) {
  return new Intl.NumberFormat('es', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

const ITEM_TYPE_LABEL: Record<string, string> = {
  service:       'Servicio',
  part:          'Repuesto',
  external_work: 'Trabajo externo',
  other:         'Otro',
}

export default async function QuoteApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const adminClient = createAdminClient()

  const { data: quotation } = await adminClient
    .from('quotation')
    .select(`
      id, number, status, subtotal, tax_amount, discount_amount, total, notes,
      quotation_item(id, description, quantity, unit_price, subtotal, item_type, discount_pct),
      work_order:work_order_id(
        vehicle:vehicle_id(plate, brand, model),
        tenant:tenant_id(name)
      )
    `)
    .eq('id', id)
    .single()

  if (!quotation) notFound()

  const q = quotation as unknown as QuotationRow
  const items = q.quotation_item ?? []
  const vehicle = q.work_order?.vehicle
  const workshopName = q.work_order?.tenant?.name ?? 'ARK Workshop'

  const isFinalized = q.status === 'approved' || q.status === 'rejected' || q.status === 'expired'

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F9FAFB', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
            style={{ backgroundColor: '#FF7316' }}
          >
            A
          </div>
          <p className="font-bold text-gray-900 text-lg">{workshopName}</p>
          {vehicle && (
            <p className="text-sm text-gray-500 mt-1">
              {vehicle.plate?.toUpperCase() ?? ''} · {vehicle.brand} {vehicle.model}
            </p>
          )}
        </div>

        {/* Quotation card */}
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-5">
          {/* Title row */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Cotización</p>
              <p className="font-bold text-gray-900">#{q.number}</p>
            </div>
            <StatusBadge status={q.status} />
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ITEM_TYPE_LABEL[item.item_type] ?? item.item_type}
                    {' · '}
                    {item.quantity} × {fmtCurrency(item.unit_price)}
                    {item.discount_pct && item.discount_pct > 0
                      ? ` (−${item.discount_pct}%)`
                      : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0 tabular-nums">
                  {fmtCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtCurrency(q.subtotal)}</span>
            </div>
            {q.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span className="tabular-nums">−{fmtCurrency(q.discount_amount)}</span>
              </div>
            )}
            {q.tax_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Impuestos</span>
                <span className="tabular-nums">{fmtCurrency(q.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="tabular-nums">{fmtCurrency(q.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {q.notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-5">
            <p className="text-xs font-semibold text-amber-700 mb-1">Notas del taller</p>
            <p className="text-sm text-amber-800 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        {/* Actions */}
        {!isFinalized ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Approve */}
            <form
              action={async () => {
                'use server'
                await approveQuote(id)
              }}
            >
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#22c55e' }}
              >
                Aprobar cotización
              </button>
            </form>

            {/* Reject */}
            <form
              action={async () => {
                'use server'
                await rejectQuote(id)
              }}
            >
              <button
                type="submit"
                className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm transition-colors hover:border-red-300 hover:text-red-600"
              >
                Rechazar
              </button>
            </form>
          </div>
        ) : (
          <FinalizedMessage status={q.status} />
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-8">
          Powered by{' '}
          <span className="font-semibold" style={{ color: '#FF7316' }}>
            ARK Workshop
          </span>
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: QuotationStatus }) {
  const map: Record<QuotationStatus, { label: string; cls: string }> = {
    draft:              { label: 'Borrador',            cls: 'bg-gray-100 text-gray-600' },
    sent:               { label: 'Enviada',             cls: 'bg-blue-100 text-blue-700' },
    partially_approved: { label: 'Parcialmente aprobada', cls: 'bg-yellow-100 text-yellow-700' },
    approved:           { label: 'Aprobada',            cls: 'bg-green-100 text-green-700' },
    rejected:           { label: 'Rechazada',           cls: 'bg-red-100 text-red-600' },
    expired:            { label: 'Expirada',            cls: 'bg-gray-100 text-gray-400' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function FinalizedMessage({ status }: { status: QuotationStatus }) {
  if (status === 'approved') {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4 text-center">
        <p className="text-2xl mb-1">✅</p>
        <p className="font-bold text-green-800">Cotización aprobada</p>
        <p className="text-sm text-green-700 mt-1">El taller ha sido notificado. Pronto te contactarán.</p>
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-center">
        <p className="text-2xl mb-1">❌</p>
        <p className="font-bold text-red-700">Cotización rechazada</p>
        <p className="text-sm text-red-600 mt-1">Contacta al taller si deseas solicitar cambios.</p>
      </div>
    )
  }
  if (status === 'expired') {
    return (
      <div className="rounded-2xl bg-gray-50 border border-gray-200 px-5 py-4 text-center">
        <p className="text-sm text-gray-500">Esta cotización ha expirado. Contacta al taller.</p>
      </div>
    )
  }
  return null
}
