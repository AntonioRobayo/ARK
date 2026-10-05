import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { recordPayment, voidInvoice } from './actions'
import { getTranslations } from 'next-intl/server'

const STATUS_CLS: Record<string, string> = {
  draft:          'bg-gray-50 text-gray-500',
  issued:         'bg-blue-50 text-blue-600',
  partially_paid: 'bg-amber-50 text-amber-600',
  paid:           'bg-emerald-50 text-emerald-600',
  cancelled:      'bg-red-50 text-red-500',
  void:           'bg-red-50 text-red-400',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: invoice }, { data: payments }, { data: paymentMethods }, { data: cashRegisters }] = await Promise.all([
    supabase.from('invoice')
      .select(`
        *,
        work_order:work_order_id(id, number, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate, brand, model)),
        invoice_line(id, description, quantity, unit_price, subtotal, tax_rate_snapshot, discount_pct)
      `)
      .eq('id', id).single(),
    supabase.from('payment')
      .select('id, amount, reference, payment_date, notes, payment_method:payment_method_id(name)')
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false }),
    supabase.from('payment_method').select('id, name').eq('is_active', true).order('name'),
    supabase.from('cash_register').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!invoice) notFound()

  const t = await getTranslations('billing')
  const STATUS: Record<string, { label: string; cls: string }> = {
    draft:          { label: t('status.draft'),     cls: STATUS_CLS.draft },
    issued:         { label: t('status.issued'),    cls: STATUS_CLS.issued },
    partially_paid: { label: t('status.partial'),   cls: STATUS_CLS.partially_paid },
    paid:           { label: t('status.paid'),      cls: STATUS_CLS.paid },
    cancelled:      { label: t('status.cancelled'), cls: STATUS_CLS.cancelled },
    void:           { label: t('status.voided'),    cls: STATUS_CLS.void },
  }

  const s = STATUS[invoice.status] ?? { label: invoice.status, cls: 'bg-gray-50 text-gray-500' }
  const saldo = (invoice.total ?? 0) - (invoice.paid_amount ?? 0)
  const canPay = ['issued', 'partially_paid'].includes(invoice.status) && saldo > 0
  const wo = invoice.work_order as any

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/billing" className="text-gray-400 hover:text-gray-600 text-sm">{t('detail.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900 font-mono">FAC-{invoice.number}</h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">

          {/* Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('detail.invoiceData')}</p>
                <p className="text-sm text-gray-700">
                  {t('detail.ot')} <Link href={`/work-orders/${wo?.id}`} className="font-medium text-slate-700 hover:underline">OT-{wo?.number}</Link>
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {t('detail.customer')} <span className="font-medium">{wo?.customer?.first_name} {wo?.customer?.last_name}</span>
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('detail.vehicle')} {wo?.vehicle?.plate} {wo?.vehicle?.brand} {wo?.vehicle?.model}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('detail.issued')}</p>
                <p className="text-sm text-gray-700">
                  {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' }) : '—'}
                </p>
                {invoice.due_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('detail.due')} {new Date(invoice.due_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Líneas */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('detail.table.description')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('detail.table.qty')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('detail.table.price')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('detail.table.taxPct')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('detail.table.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.invoice_line ?? []).map((line: any) => (
                  <tr key={line.id} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{line.description}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{line.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">${(line.unit_price ?? 0).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{line.tax_rate_snapshot ?? 0}%</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">${(line.subtotal ?? 0).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-end">
                <div className="space-y-1 text-sm text-right">
                  {invoice.tax_amount > 0 && (
                    <div className="flex gap-10 text-gray-500"><span>{t('detail.tax')}</span><span>${(invoice.tax_amount).toLocaleString('es-CO')}</span></div>
                  )}
                  {invoice.discount_amount > 0 && (
                    <div className="flex gap-10 text-gray-500"><span>{t('detail.discount')}</span><span>-${(invoice.discount_amount).toLocaleString('es-CO')}</span></div>
                  )}
                  <div className="flex gap-10 font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                    <span>{t('detail.total')}</span><span>${(invoice.total ?? 0).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-10 text-emerald-600 font-medium">
                    <span>{t('detail.paid')}</span><span>${(invoice.paid_amount ?? 0).toLocaleString('es-CO')}</span>
                  </div>
                  {saldo > 0 && (
                    <div className="flex gap-10 text-amber-600 font-bold">
                      <span>{t('detail.balance')}</span><span>${saldo.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pagos registrados */}
          {(payments ?? []).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.payments')}</p>
              <div className="space-y-2">
                {payments!.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-700">${(p.amount).toLocaleString('es-CO')}</span>
                      {p.payment_method && <span className="text-gray-400 text-xs ml-2">{p.payment_method.name}</span>}
                      {p.reference && <span className="text-gray-400 text-xs ml-2">{t('detail.ref')} {p.reference}</span>}
                    </div>
                    <span className="text-gray-400 text-xs">
                      {new Date(p.payment_date).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Registrar pago */}
          {canPay && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.registerPayment')}</p>
              <form action={recordPayment} className="space-y-3">
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <input type="hidden" name="work_order_id" value={wo?.id ?? ''} />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('detail.paymentAmount')}</label>
                  <input name="amount" type="number" min="0.01" step="0.01" defaultValue={saldo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                {(paymentMethods ?? []).length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('detail.paymentMethod')}</label>
                    <select name="payment_method_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                      <option value="">{t('detail.noMethod')}</option>
                      {paymentMethods!.map((pm: any) => (
                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(cashRegisters ?? []).length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('detail.cashRegister')}</label>
                    <select name="cash_register_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                      <option value="">{t('detail.noMethod')}</option>
                      {cashRegisters!.map((cr: any) => (
                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('detail.reference')}</label>
                  <input name="reference" type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder={t('detail.referencePlaceholder')} />
                </div>
                <button type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  {t('detail.submitPayment')}
                </button>
              </form>
            </div>
          )}

          {/* Anular */}
          {['issued', 'partially_paid', 'draft'].includes(invoice.status) && (
            <form action={voidInvoice}>
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <button type="submit"
                className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-medium py-2 rounded-lg text-sm transition-colors"
                onClick={e => { if (!confirm(t('detail.voidConfirm'))) e.preventDefault() }}>
                {t('detail.voidInvoice')}
              </button>
            </form>
          )}

          {invoice.notes && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('detail.notes')}</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
