import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createInvoice } from './actions'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ work_order_id?: string }>
}) {
  const { work_order_id } = await searchParams
  if (!work_order_id) notFound()

  const supabase = await createClient()

  const [{ data: ot }, { data: quotations }] = await Promise.all([
    supabase.from('work_order')
      .select('id, number, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate, brand, model)')
      .eq('id', work_order_id).single(),
    supabase.from('quotation')
      .select('id, number, status, total, subtotal, tax_amount, discount_amount, quotation_item(*)')
      .eq('work_order_id', work_order_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
  ])

  if (!ot) notFound()

  const quotation = (quotations ?? [])[0] ?? null

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/work-orders/${work_order_id}`} className="text-gray-400 hover:text-gray-600 text-sm">← OT-{(ot as any).number}</Link>
        <h1 className="text-2xl font-bold text-gray-900">Crear factura</h1>
      </div>

      <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
        <span className="text-gray-500">OT-{(ot as any).number} · </span>
        <span className="font-semibold text-gray-900">
          {(ot.customer as any)?.first_name} {(ot.customer as any)?.last_name}
        </span>
        <span className="text-gray-500"> · {(ot.vehicle as any)?.plate} {(ot.vehicle as any)?.brand} {(ot.vehicle as any)?.model}</span>
      </div>

      {!quotation ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">No hay cotización aprobada</p>
          <p className="text-amber-600 text-sm mt-1">Primero aprueba la cotización de la OT</p>
          <Link href={`/work-orders/${work_order_id}/quotation`}
            className="mt-3 inline-block text-slate-700 border border-slate-300 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
            Ir a cotización
          </Link>
        </div>
      ) : (
        <form action={createInvoice} className="space-y-5">
          <input type="hidden" name="work_order_id" value={work_order_id} />
          <input type="hidden" name="quotation_id" value={quotation.id} />

          {/* Resumen de ítems */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase">Ítems de la cotización COT-{quotation.number}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-400">Descripción</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Cant.</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Precio</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.quotation_item ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-700">{item.description}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-500">${(item.unit_price ?? 0).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">${(item.subtotal ?? 0).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-8 text-sm">
              {quotation.tax_amount > 0 && (
                <>
                  <span className="text-gray-500">IVA: ${(quotation.tax_amount).toLocaleString('es-CO')}</span>
                  <span className="text-gray-500">Subtotal: ${(quotation.subtotal).toLocaleString('es-CO')}</span>
                </>
              )}
              <span className="font-bold text-gray-900">Total: ${(quotation.total).toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* Fecha de vencimiento */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de vencimiento (opcional)</label>
              <input name="due_at" type="date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
              <textarea name="notes" rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                placeholder="Términos, condiciones..." />
            </div>
          </div>

          <button type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
            Emitir factura por ${(quotation.total).toLocaleString('es-CO')}
          </button>
        </form>
      )}
    </div>
  )
}
