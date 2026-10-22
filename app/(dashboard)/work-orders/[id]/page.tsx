import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR, STATUS_TRANSITIONS,
} from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'
import { LocalDate, LocalDateOnly } from '@/components/local-date'
import { getTranslations } from 'next-intl/server'
import { StatusTransitionButtons } from '@/components/work-orders/StatusTransitionButtons'
import { TimeTracker } from '@/components/work-orders/TimeTracker'
import { OTGallery } from '@/components/work-orders/OTGallery'
import { FindingsSection } from '@/components/work-orders/FindingsSection'
import { CustomerPartsSection } from '@/components/work-orders/CustomerPartsSection'

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; notified?: string }>
}) {
  const { id } = await params
  const { notified, error: pageError } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const [
    { data: ot },
    { data: statusLog },
    { data: quotations },
    { data: invoices },
    { data: timeEntries },
    { data: driveAttachments },
    { data: findings },
    { data: auditLog },
    { data: customerParts },
  ] = await Promise.all([
    adminClient
      .from('work_order')
      .select(`
        *,
        customer:customer_id(id, first_name, last_name, phone, email),
        vehicle:vehicle_id(id, plate, brand, model, year, engine_cc, color, current_mileage),
        technician:technician_id(id, first_name, last_name),
        branch:branch_id(name)
      `)
      .eq('id', id)
      .single(),
    adminClient
      .from('work_order_status_log')
      .select('id, from_status, to_status, reason, created_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('quotation')
      .select(`
        id, number, status, total, subtotal, tax_amount, discount_amount,
        quotation_item(id, description, quantity, unit_price, subtotal, item_type, tax_rate_snapshot, discount_pct)
      `)
      .eq('work_order_id', id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    adminClient
      .from('invoice')
      .select('id, number, status, total, paid_amount')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('work_order_time_log')
      .select('id, technician_id, started_at, ended_at, minutes, notes')
      .eq('work_order_id', id)
      .order('started_at', { ascending: false }),
    adminClient
      .from('work_order_drive_attachment')
      .select('id, section, drive_file_id, drive_thumb_url, original_name, mime_type, size_kb, created_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true }),
    adminClient
      .from('work_order_finding')
      .select('id, description, severity, status, notified_at, customer_responded_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true }),
    adminClient
      .from('tenant_audit_log')
      .select('id, event, created_at, details')
      .or('event.like.finding.%,event.like.customer_part.%')
      .filter('details->>work_order_id', 'eq', id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('work_order_customer_part')
      .select('id, description, quantity, condition, notes, created_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!ot) notFound()

  // Check if Drive is enabled for this tenant
  const { data: myProfile } = await adminClient.from('user_profile').select('tenant_id').eq('id', user.id).single()
  let driveEnabled = false
  if (myProfile?.tenant_id) {
    const { data: tenantDrive } = await adminClient
      .from('tenants')
      .select('gdrive_enabled')
      .eq('id', myProfile.tenant_id)
      .single()
    driveEnabled = tenantDrive?.gdrive_enabled ?? false
  }

  const t = await getTranslations('workOrders')
  const transitions = STATUS_TRANSITIONS[ot.status as WorkOrderStatus] ?? []
  const activeQuotation = (quotations ?? [])[0] ?? null

  const AUDIT_EVENT_LABEL: Record<string, string> = {
    'finding.added':            'Hallazgo registrado',
    'finding.notified':         'Hallazgos notificados al cliente',
    'finding.customer_approved': 'Cliente solicitó cotizar',
    'finding.customer_noted':   'Cliente registró como nota',
    'customer_part.added':      'Repuesto del cliente registrado',
  }

  const mergedTimeline = [
    ...(statusLog ?? []).map((e: any) => ({ ...e, _type: 'status' as const })),
    ...(auditLog ?? []).map((e: any) => ({ ...e, _type: 'audit' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const totalMinutes = (timeEntries ?? []).reduce((s, e) => s + (e.minutes ?? 0), 0)
  const items = activeQuotation?.quotation_item ?? []
  const totalServices = items.reduce((s: number, i: any) => s + (i.subtotal ?? 0), 0)
  const activeInvoice = (invoices ?? [])[0] ?? null

  return (
    <div className="max-w-5xl">
      {notified === '1' && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          ✅ Email enviado al cliente con los hallazgos. Cuando responda, el estado se actualizará aquí automáticamente.
        </div>
      )}
      {pageError && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {pageError === 'no_customer_email' && 'El cliente no tiene correo registrado.'}
          {pageError === 'no_pending_findings' && 'No hay hallazgos pendientes de notificación.'}
          {!['no_customer_email', 'no_pending_findings'].includes(pageError) && decodeURIComponent(pageError)}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/work-orders" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">{t('detail.backToOTs')}</Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono whitespace-nowrap">{ot.number}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[ot.status as WorkOrderStatus]}`}>
                {STATUS_LABEL[ot.status as WorkOrderStatus]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[ot.priority ?? 'normal']}`}>
                {PRIORITY_LABEL[ot.priority ?? 'normal']}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {ot.branch?.name} · Creada <LocalDateOnly date={ot.created_at} options={{ day:'2-digit', month:'long', year:'numeric' }} />
            </p>
          </div>
        </div>

        {/* Acciones de estado */}
        <StatusTransitionButtons otId={ot.id} transitions={transitions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Columna izquierda (2/3) */}
        <div className="md:col-span-2 space-y-5">

          {/* Info vehículo + cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Vehículo</p>
              <p className="font-mono font-bold text-xl text-gray-900">{ot.vehicle?.plate ?? '—'}</p>
              <p className="font-medium text-gray-700 mt-0.5">{ot.vehicle?.brand} {ot.vehicle?.model} {ot.vehicle?.year}</p>
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                {ot.vehicle?.engine_cc && <p>Motor: {ot.vehicle.engine_cc}cc</p>}
                {ot.vehicle?.color && <p>Color: {ot.vehicle.color}</p>}
                {ot.reception_mileage && <p>Km recepción: {ot.reception_mileage.toLocaleString()}</p>}
              </div>
              <Link href={`/vehicles/${ot.vehicle?.id}`} className="text-xs text-slate-500 hover:underline mt-2 inline-block">
                {t('detail.viewHistory')}
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Cliente</p>
              <p className="font-semibold text-gray-900">{ot.customer?.first_name} {ot.customer?.last_name}</p>
              {ot.customer?.phone && <p className="text-sm text-gray-500 mt-0.5">{ot.customer.phone}</p>}
              {ot.customer?.email && <p className="text-xs text-gray-400">{ot.customer.email}</p>}
              <Link href={`/customers/${ot.customer?.id}`} className="text-xs text-slate-500 hover:underline mt-2 inline-block">
                {t('detail.viewProfile')}
              </Link>
            </div>
          </div>

          {/* Recepción */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.reception')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">{t('detail.fuel')}</p>
                <p className="font-medium text-gray-700 mt-1">{ot.fuel_level ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{t('detail.technician')}</p>
                <p className="font-medium text-gray-700 mt-1">
                  {ot.technician ? `${ot.technician.first_name} ${ot.technician.last_name ?? ''}` : t('unassigned')}
                </p>
              </div>
            </div>
            {ot.reception_notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{t('detail.observations')}</p>
                <p className="text-sm text-gray-700 mt-0.5">{ot.reception_notes}</p>
              </div>
            )}
            {ot.estimated_delivery_at && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{t('detail.estimatedDelivery')}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  <LocalDate date={ot.estimated_delivery_at} options={{ day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' }} />
                </p>
              </div>
            )}
          </div>

          {/* Repuestos del cliente */}
          <CustomerPartsSection
            otId={id}
            vehicleId={ot.vehicle_id}
            parts={customerParts ?? []}
            attachments={(driveAttachments ?? []) as any[]}
            driveEnabled={driveEnabled}
          />

          {/* Hallazgos de diagnóstico */}
          <FindingsSection
            otId={id}
            findings={findings ?? []}
            customerEmail={ot.customer?.email}
            customerName={`${ot.customer?.first_name ?? ''} ${ot.customer?.last_name ?? ''}`.trim()}
            otNumber={ot.number}
            vehiclePlate={ot.vehicle?.plate ?? ''}
          />

          {/* Cotización / Servicios */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('detail.quotation')}</p>
                {activeQuotation && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeQuotation.number} ·{' '}
                    <span className={`font-medium ${
                      activeQuotation.status === 'approved' ? 'text-emerald-600' :
                      activeQuotation.status === 'draft' ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {activeQuotation.status === 'approved' ? t('detail.approved') :
                       activeQuotation.status === 'draft' ? t('detail.draft') :
                       activeQuotation.status === 'sent' ? t('detail.sent') : activeQuotation.status}
                    </span>
                  </p>
                )}
              </div>
              <Link
                href={`/work-orders/${id}/quotation`}
                className="text-xs text-slate-600 hover:text-slate-800 font-medium border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {activeQuotation ? t('detail.manageQuotation') : t('detail.createQuotation')}
              </Link>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{t('detail.noServices')}</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Descripción</th>
                      <th className="text-left pb-2 font-medium">Tipo</th>
                      <th className="text-right pb-2 font-medium">Cant.</th>
                      <th className="text-right pb-2 font-medium">P. Unit.</th>
                      <th className="text-right pb-2 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{item.description}</td>
                        <td className="py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            item.item_type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {item.item_type === 'service' ? t('detail.itemType.service') : t('detail.itemType.part')}
                          </span>
                        </td>
                        <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-500">${(item.unit_price ?? 0).toLocaleString('es-CO')}</td>
                        <td className="py-2 text-right font-medium text-gray-800">${(item.subtotal ?? 0).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1">
                  <div className="text-xs text-gray-400">
                    {activeQuotation?.tax_amount ? `${t('detail.tax')} $${activeQuotation.tax_amount.toLocaleString('es-CO')}` : ''}
                    {activeQuotation?.discount_amount ? ` · ${t('detail.discount')} $${activeQuotation.discount_amount.toLocaleString('es-CO')}` : ''}
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {t('detail.total', { amount: (activeQuotation?.total ?? totalServices).toLocaleString('es-CO') })}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Factura */}
          {activeInvoice && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('detail.invoice')}</p>
                <Link href={`/billing/${activeInvoice.id}`} className="text-xs text-slate-600 hover:underline font-medium">
                  {t('detail.viewInvoice')}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-gray-800">{activeInvoice.number}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    activeInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                    activeInvoice.status === 'partially_paid' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {activeInvoice.status === 'paid' ? t('detail.paid') :
                     activeInvoice.status === 'partially_paid' ? t('detail.partiallyPaid') :
                     activeInvoice.status === 'issued' ? t('detail.issued') : activeInvoice.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">${(activeInvoice.total ?? 0).toLocaleString('es-CO')}</p>
                  {activeInvoice.paid_amount > 0 && (
                    <p className="text-xs text-gray-400">{t('detail.paidAmount', { amount: activeInvoice.paid_amount.toLocaleString('es-CO') })}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Crear factura si hay cotización aprobada y no hay factura */}
          {activeQuotation?.status === 'approved' && !activeInvoice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">{t('detail.quoteApproved')}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{t('detail.canCreateInvoice')}</p>
              </div>
              <Link
                href={`/billing/new?work_order_id=${id}`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {t('detail.createInvoice')}
              </Link>
            </div>
          )}
        </div>

        {/* Columna derecha (1/3) — Timeline + acciones */}
        <div className="space-y-5">

          {/* Acciones rápidas de la OT */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('detail.actions')}</p>
            <div className="space-y-2">
              <Link href={`/work-orders/${id}/quotation`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-slate-800 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span>📋</span> {activeQuotation ? t('detail.editQuotation') : 'Crear cotización'}
              </Link>
              {activeQuotation?.status === 'approved' && !activeInvoice && (
                <Link href={`/billing/new?work_order_id=${id}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-slate-800 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span>🧾</span> {t('detail.generateInvoice')}
                </Link>
              )}
              {activeInvoice && activeInvoice.status !== 'paid' && (
                <Link href={`/billing/${activeInvoice.id}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-slate-800 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span>💳</span> {t('detail.registerPayment')}
                </Link>
              )}
              <Link href={`/appointments/new?customer_id=${ot.customer_id}&vehicle_id=${ot.vehicle_id}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-slate-800 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span>📅</span> {t('detail.scheduleAppointment')}
              </Link>
            </div>
          </div>

          {/* Tiempo registrado */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('time.title')}</p>
            <TimeTracker
              otId={id}
              currentUserId={user.id}
              timeEntries={timeEntries ?? []}
              totalMinutes={totalMinutes}
            />
          </div>

          {/* Fotos / Drive */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Fotos</p>
            <OTGallery
              workOrderId={id}
              vehicleId={ot.vehicle_id}
              attachments={(driveAttachments ?? []) as any[]}
              driveEnabled={driveEnabled}
            />
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">{t('detail.statusHistory')}</p>

            {mergedTimeline.length === 0 ? (
              <p className="text-xs text-gray-400">{t('detail.noHistory')}</p>
            ) : (
              <div className="space-y-3">
                {mergedTimeline.map((entry: any, i: number) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${
                        i === 0
                          ? entry._type === 'audit' ? 'bg-blue-500' : 'bg-slate-700'
                          : entry._type === 'audit' ? 'bg-blue-200' : 'bg-gray-300'
                      }`} />
                      {i < mergedTimeline.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {entry._type === 'audit'
                          ? (AUDIT_EVENT_LABEL[entry.event] ?? entry.event)
                          : (STATUS_LABEL[entry.to_status as WorkOrderStatus] ?? entry.to_status)}
                      </p>
                      {entry._type === 'audit' && entry.event === 'finding.notified' && entry.details?.count && (
                        <p className="text-xs text-gray-400 mt-0.5">{entry.details.count} hallazgo{entry.details.count !== 1 ? 's' : ''} enviado{entry.details.count !== 1 ? 's' : ''} por email</p>
                      )}
                      {entry._type === 'audit' && (entry.event === 'finding.added' || entry.event === 'customer_part.added') && entry.details?.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.details.description}</p>
                      )}
                      {entry._type === 'audit' && (entry.event === 'finding.customer_approved' || entry.event === 'finding.customer_noted') && entry.details?.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.details.description}</p>
                      )}
                      {entry._type === 'status' && entry.reason && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.reason}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">
                        <LocalDate date={entry.created_at} options={{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
