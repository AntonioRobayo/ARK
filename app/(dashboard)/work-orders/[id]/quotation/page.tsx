import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { addQuotationItem, removeQuotationItem, changeQuotationStatus, upsertQuotation } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { AddItemForm } from '@/components/quotation/AddItemForm'
import { getTranslations } from 'next-intl/server'

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-600',
  draft:    'bg-amber-50 text-amber-600',
  sent:     'bg-blue-50 text-blue-600',
}
const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprobada',
  draft:    'Borrador',
  sent:     'Enviada',
}

export default async function QuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sent?: string }>
}) {
  const { id } = await params
  const { sent } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: myProfile } = await adminClient.from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!myProfile?.tenant_id) redirect('/superadmin')

  const [{ data: ot }, { data: quotations }, { data: services }, { data: taxRates }, { data: customerParts }, { data: approvedFindings }] = await Promise.all([
    adminClient.from('work_order')
      .select('id, number, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate, brand, model)')
      .eq('id', id).eq('tenant_id', myProfile.tenant_id).single(),
    adminClient.from('quotation')
      .select(`id, number, status, total, subtotal, tax_amount, discount_amount, notes, created_at,
        quotation_item(id, description, quantity, unit_price, subtotal, item_type, tax_rate_snapshot, discount_pct, customer_response)`)
      .eq('work_order_id', id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true }),
    adminClient.from('service_catalog').select('id, name, base_price, category').eq('tenant_id', myProfile.tenant_id).eq('is_active', true).order('name'),
    adminClient.from('tax_rate').select('id, name, rate, is_default').eq('tenant_id', myProfile.tenant_id).eq('is_active', true).order('name'),
    adminClient.from('work_order_customer_part').select('id, description, quantity, condition, notes').eq('work_order_id', id).order('created_at', { ascending: true }),
    adminClient.from('work_order_finding').select('id, description, severity').eq('work_order_id', id).eq('customer_response', 'approve_quote').order('created_at', { ascending: true }),
  ])

  if (!ot) notFound()

  // Auto-create quotation if none exists — skip the empty-state click
  if (!quotations || quotations.length === 0) {
    // Count ALL quotations (including cancelled) to avoid reusing numbers
    const { count } = await adminClient
      .from('quotation')
      .select('id', { count: 'exact', head: true })
      .eq('work_order_id', id)
    const seq = (count ?? 0) + 1
    const quotationNumber = `${ot.number}-COT-${seq}`
    await adminClient.from('quotation').insert({
      tenant_id:        myProfile.tenant_id,
      work_order_id:    id,
      number:           quotationNumber,
      status:           'draft',
      subtotal:         0,
      tax_amount:       0,
      discount_amount:  0,
      total:            0,
      created_by:       user.id,
    })
    revalidatePath(`/work-orders/${id}`)
    redirect(`/work-orders/${id}/quotation`)
  }

  const t = await getTranslations('quotation')
  const allQuotations = quotations ?? []
  const activeQuotation = allQuotations.find(q => ['draft', 'sent'].includes(q.status)) ?? null
  const approvedQuotations = allQuotations.filter(q => q.status === 'approved')
  const hasAny = allQuotations.length > 0
  const allApproved = hasAny && !activeQuotation
  const defaultTax = (taxRates ?? []).find((t: any) => t.is_default)

  // For header display: active quotation takes priority, else most recent
  const displayQuotation = activeQuotation ?? (allQuotations[allQuotations.length - 1] ?? null)

  return (
    <div className="max-w-4xl">
      {sent === '1' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>✅</span>
          <span>Cotización enviada al cliente por correo.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/work-orders/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">{t('back', { n: ot.number })}</Link>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            {displayQuotation && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[displayQuotation.status] ?? 'bg-gray-50 text-gray-500'}`}>
                {STATUS_LABEL[displayQuotation.status] ?? displayQuotation.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{ot.number}</span><span>·</span>
            <span>{(ot.customer as any)?.first_name} {(ot.customer as any)?.last_name}</span><span>·</span>
            <span className="font-mono">{(ot.vehicle as any)?.plate}</span>
            <span>{(ot.vehicle as any)?.brand} {(ot.vehicle as any)?.model}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeQuotation?.status === 'draft' && (
            <form action={changeQuotationStatus}>
              <input type="hidden" name="quotation_id" value={activeQuotation.id} />
              <input type="hidden" name="work_order_id" value={id} />
              <input type="hidden" name="status" value="sent" />
              <SubmitButton pendingLabel="Enviando…" className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                ✉️ Enviar cotización
              </SubmitButton>
            </form>
          )}
          {activeQuotation?.status === 'sent' && (
            <form action={changeQuotationStatus}>
              <input type="hidden" name="quotation_id" value={activeQuotation.id} />
              <input type="hidden" name="work_order_id" value={id} />
              <input type="hidden" name="status" value="approved" />
              <SubmitButton pendingLabel="Aprobando…" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {t('approve')}
              </SubmitButton>
            </form>
          )}
          {allApproved && (
            <Link href={`/billing/new?work_order_id=${id}`}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
              {t('generateInvoice')}
            </Link>
          )}
        </div>
      </div>

      {/* No quotation yet */}
      {!hasAny && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-5">
          <p className="text-gray-500 mb-4">{t('noQuotation')}</p>
          <form action={upsertQuotation}>
            <input type="hidden" name="work_order_id" value={id} />
            <input type="hidden" name="tenant_id" value={myProfile.tenant_id} />
            <SubmitButton pendingLabel="Creando cotización…" className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
              {t('create')}
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Approved quotations — read-only history cards */}
      {approvedQuotations.map((q: any, idx: number) => {
        const qItems = q.quotation_item ?? []
        const isSuplement = idx > 0
        return (
          <div key={q.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {isSuplement && <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Suplemento</span>}
                <span className="text-sm font-semibold text-gray-700">Cotización {q.number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600">Aprobada</span>
              </div>
              <span className="text-sm font-bold text-gray-900">${(q.total ?? 0).toLocaleString('es-CO')}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {qItems.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-700">
                      <div className="flex items-center gap-2">
                        {item.description}
                        {item.customer_response === 'approved' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium shrink-0">✓ Cliente aprobó</span>
                        )}
                        {item.customer_response === 'rejected' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium shrink-0">✗ Cliente rechazó</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.item_type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {item.item_type === 'service' ? t('service') : t('part')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">${(item.unit_price ?? 0).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{item.tax_rate_snapshot ?? 0}%</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">${(item.subtotal ?? 0).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Active quotation — editable */}
      {activeQuotation && (() => {
        const items = activeQuotation.quotation_item ?? []
        const isSuplement = approvedQuotations.length > 0
        return (
          <>
            {isSuplement && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Suplemento en progreso</span>
                <div className="flex-1 h-px bg-purple-100" />
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
              {isSuplement && (
                <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                  <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Suplemento</span>
                  <span className="text-sm font-semibold text-gray-700">Cotización {activeQuotation.number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[activeQuotation.status] ?? ''}`}>
                    {STATUS_LABEL[activeQuotation.status] ?? activeQuotation.status}
                  </span>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('table.description')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('table.type')}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.qty')}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.price')}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.tax')}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('table.subtotal')}</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">{t('noItems')}</td>
                    </tr>
                  ) : (
                    items.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">
                          <div className="flex items-center gap-2">
                            {item.description}
                            {item.customer_response === 'approved' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium shrink-0">✓ Cliente aprobó</span>
                            )}
                            {item.customer_response === 'rejected' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium shrink-0">✗ Cliente rechazó</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.item_type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {item.item_type === 'service' ? t('service') : t('part')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">${(item.unit_price ?? 0).toLocaleString('es-CO')}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400">{item.tax_rate_snapshot ?? 0}%</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">${(item.subtotal ?? 0).toLocaleString('es-CO')}</td>
                        <td className="px-4 py-2.5 text-center">
                          <form action={removeQuotationItem}>
                            <input type="hidden" name="item_id" value={item.id} />
                            <input type="hidden" name="quotation_id" value={activeQuotation.id} />
                            <input type="hidden" name="work_order_id" value={id} />
                            <input type="hidden" name="item_subtotal" value={item.subtotal ?? 0} />
                            <input type="hidden" name="current_total" value={activeQuotation.total ?? 0} />
                            <button type="submit" className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {items.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <div className="text-sm space-y-1 text-right">
                    <div className="flex gap-8 text-gray-500">
                      <span>{t('subtotal')}</span>
                      <span>${(activeQuotation.subtotal ?? 0).toLocaleString('es-CO')}</span>
                    </div>
                    {activeQuotation.tax_amount > 0 && (
                      <div className="flex gap-8 text-gray-500">
                        <span>{t('taxLabel')}</span>
                        <span>${activeQuotation.tax_amount.toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    {activeQuotation.discount_amount > 0 && (
                      <div className="flex gap-8 text-gray-500">
                        <span>{t('discount')}</span>
                        <span>-${activeQuotation.discount_amount.toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    <div className="flex gap-8 font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                      <span>{t('total')}</span>
                      <span>${(activeQuotation.total ?? 0).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Hallazgos aprobados */}
      {(approvedFindings ?? []).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-3">Hallazgos solicitados por el cliente</p>
          <div className="space-y-2">
            {(approvedFindings ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center gap-3 text-sm">
                <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded border ${
                  f.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  f.severity === 'moderate' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {f.severity === 'critical' ? 'Crítico' : f.severity === 'moderate' ? 'Moderado' : 'Menor'}
                </span>
                <span className="text-gray-700 font-medium">{f.description}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">El cliente solicitó cotizar estos hallazgos — agrégalos como ítems arriba.</p>
        </div>
      )}

      {/* Repuestos del cliente */}
      {(customerParts ?? []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-3">Repuestos traídos por el cliente</p>
          <div className="space-y-2">
            {(customerParts ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded border ${
                  p.condition === 'new'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  p.condition === 'used'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                              'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {p.condition === 'new' ? 'Nuevo' : p.condition === 'used' ? 'Usado' : 'Dañado'}
                </span>
                <span className="text-gray-700 font-medium">
                  {p.description}{p.quantity > 1 ? <span className="text-gray-400 font-normal"> × {p.quantity}</span> : ''}
                </span>
                {p.notes && <span className="text-gray-400 text-xs">· {p.notes}</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">Estos repuestos no tienen costo — son de propiedad del cliente.</p>
        </div>
      )}

      {/* Add item form — only for active quotation */}
      {activeQuotation && (
        <AddItemForm
          quotationId={activeQuotation.id}
          workOrderId={id}
          currentTotal={activeQuotation.total ?? 0}
          services={(services ?? []).map((s: any) => ({ id: s.id, name: s.name, base_price: s.base_price }))}
          defaultTaxRate={defaultTax?.rate ?? 0}
          addItemAction={addQuotationItem}
          vehicleBrand={(ot.vehicle as any)?.brand ?? undefined}
          vehicleModel={(ot.vehicle as any)?.model ?? undefined}
        />
      )}

      {/* Agregar suplemento — solo cuando todas están aprobadas */}
      {allApproved && (
        <div className="border border-dashed border-purple-200 rounded-xl p-5 text-center bg-purple-50/40">
          <p className="text-sm text-gray-600 mb-1">¿Trabajo adicional identificado?</p>
          <p className="text-xs text-gray-400 mb-4">Crea un suplemento — va por el mismo flujo de aprobación del cliente.</p>
          <form action={upsertQuotation}>
            <input type="hidden" name="work_order_id" value={id} />
            <input type="hidden" name="tenant_id" value={myProfile.tenant_id} />
            <SubmitButton pendingLabel="Creando suplemento…" className="bg-purple-700 hover:bg-purple-800 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
              + Agregar suplemento
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  )
}
