import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { addQuotationItem, removeQuotationItem, changeQuotationStatus, upsertQuotation } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function QuotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: quotations }, { data: services }, { data: taxRates }] = await Promise.all([
    supabase.from('work_order')
      .select('id, number, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate, brand, model)')
      .eq('id', id).single(),
    supabase.from('quotation')
      .select(`id, number, status, total, subtotal, tax_amount, discount_amount, notes,
        quotation_item(id, description, quantity, unit_price, subtotal, item_type, tax_rate_snapshot, discount_pct)`)
      .eq('work_order_id', id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('service_catalog').select('id, name, base_price, category').eq('is_active', true).order('name'),
    supabase.from('tax_rate').select('id, name, rate, is_default').eq('is_active', true).order('name'),
  ])

  if (!ot) notFound()

  const t = await getTranslations('quotation')
  const quotation = (quotations ?? [])[0] ?? null
  const items = quotation?.quotation_item ?? []
  const defaultTax = (taxRates ?? []).find((t: any) => t.is_default)

  const canEdit = !quotation || ['draft', 'sent'].includes(quotation.status)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/work-orders/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">{t('back', { n: ot.number })}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {quotation && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            quotation.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
            quotation.status === 'draft' ? 'bg-amber-50 text-amber-600' :
            'bg-gray-50 text-gray-500'
          }`}>
            {quotation.status === 'approved' ? 'Aprobada' : quotation.status === 'draft' ? 'Borrador' :
             quotation.status === 'sent' ? 'Enviada' : quotation.status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
        <span>OT-{ot.number}</span><span>·</span>
        <span>{(ot.customer as any)?.first_name} {(ot.customer as any)?.last_name}</span><span>·</span>
        <span className="font-mono">{(ot.vehicle as any)?.plate}</span>
        <span>{(ot.vehicle as any)?.brand} {(ot.vehicle as any)?.model}</span>
      </div>

      {/* Crear cotización si no existe */}
      {!quotation && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-5">
          <p className="text-gray-500 mb-4">{t('noQuotation')}</p>
          <form action={upsertQuotation}>
            <input type="hidden" name="work_order_id" value={id} />
            <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
              {t('create')}
            </button>
          </form>
        </div>
      )}

      {quotation && (
        <>
          {/* Acciones de estado */}
          <div className="flex gap-2 mb-5">
            {quotation.status === 'draft' && (
              <form action={changeQuotationStatus}>
                <input type="hidden" name="quotation_id" value={quotation.id} />
                <input type="hidden" name="work_order_id" value={id} />
                <input type="hidden" name="status" value="sent" />
                <button type="submit" className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                  {t('markSent')}
                </button>
              </form>
            )}
            {['draft', 'sent'].includes(quotation.status) && (
              <form action={changeQuotationStatus}>
                <input type="hidden" name="quotation_id" value={quotation.id} />
                <input type="hidden" name="work_order_id" value={id} />
                <input type="hidden" name="status" value="approved" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                  {t('approve')}
                </button>
              </form>
            )}
            {quotation.status === 'approved' && (
              <Link href={`/billing/new?work_order_id=${id}`}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                {t('generateInvoice')}
              </Link>
            )}
          </div>

          {/* Tabla de ítems */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('table.description')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('table.type')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.qty')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.price')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.tax')}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.subtotal')}</th>
                  {canEdit && <th className="w-10 px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-gray-400 text-sm">
                      {t('noItems')}
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          item.item_type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {item.item_type === 'service' ? t('service') : t('part')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">${(item.unit_price ?? 0).toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{item.tax_rate_snapshot ?? 0}%</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800">${(item.subtotal ?? 0).toLocaleString('es-CO')}</td>
                      {canEdit && (
                        <td className="px-4 py-2.5 text-center">
                          <form action={removeQuotationItem}>
                            <input type="hidden" name="item_id" value={item.id} />
                            <input type="hidden" name="quotation_id" value={quotation.id} />
                            <input type="hidden" name="work_order_id" value={id} />
                            <button type="submit" className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totales */}
            {items.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                <div className="text-sm space-y-1 text-right">
                  <div className="flex gap-8 text-gray-500">
                    <span>{t('subtotal')}</span>
                    <span>${(quotation.subtotal ?? 0).toLocaleString('es-CO')}</span>
                  </div>
                  {quotation.tax_amount > 0 && (
                    <div className="flex gap-8 text-gray-500">
                      <span>{t('taxLabel')}</span>
                      <span>${quotation.tax_amount.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {quotation.discount_amount > 0 && (
                    <div className="flex gap-8 text-gray-500">
                      <span>{t('discount')}</span>
                      <span>-${quotation.discount_amount.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex gap-8 font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                    <span>{t('total')}</span>
                    <span>${(quotation.total ?? 0).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agregar ítem */}
          {canEdit && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">{t('addItem')}</p>

              {/* Quick add from service catalog */}
              {(services ?? []).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">{t('fromCatalog')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(services ?? []).slice(0, 12).map((svc: any) => (
                      <form key={svc.id} action={addQuotationItem}>
                        <input type="hidden" name="quotation_id" value={quotation.id} />
                        <input type="hidden" name="work_order_id" value={id} />
                        <input type="hidden" name="description" value={svc.name} />
                        <input type="hidden" name="quantity" value="1" />
                        <input type="hidden" name="unit_price" value={svc.base_price ?? 0} />
                        <input type="hidden" name="item_type" value="service" />
                        <input type="hidden" name="tax_rate" value={defaultTax?.rate ?? 0} />
                        <input type="hidden" name="discount_pct" value="0" />
                        <button type="submit" className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-gray-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                          + {svc.name}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual add */}
              <form action={addQuotationItem} className="grid grid-cols-6 gap-3 items-end">
                <input type="hidden" name="quotation_id" value={quotation.id} />
                <input type="hidden" name="work_order_id" value={id} />

                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">{t('form.description')}</label>
                  <input name="description" required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Cambio de aceite..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('form.type')}</label>
                  <select name="item_type" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="service">{t('service')}</option>
                    <option value="part">{t('part')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('form.unitPrice')}</label>
                  <input name="unit_price" type="number" min="0" step="0.01" defaultValue="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('form.qty')}</label>
                  <input name="quantity" type="number" min="1" step="0.01" defaultValue="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('form.taxPct')}</label>
                    <input name="tax_rate" type="number" min="0" max="100" defaultValue={defaultTax?.rate ?? 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                      +
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
