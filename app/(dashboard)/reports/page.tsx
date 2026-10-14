import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export default async function ReportsPage() {
  const supabase = await createClient()

  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [
    { data: thisMonthInvoices },
    { data: lastMonthInvoices },
    { data: otsByStatus },
    { data: topServices },
    { data: closedOTs },
  ] = await Promise.all([
    supabase.from('invoice').select('total').eq('status', 'paid').gte('created_at', startMonth),
    supabase.from('invoice').select('total').eq('status', 'paid').gte('created_at', startLastMonth).lte('created_at', endLastMonth),
    supabase.from('work_order').select('status'),
    supabase.from('quotation_item').select('description, quantity, subtotal, item_type').eq('item_type', 'service').order('subtotal', { ascending: false }).limit(10),
    supabase
      .from('work_order')
      .select('id, technician_id, technician:technician_id(first_name, last_name), invoices:invoice(total)')
      .in('status', ['closed'])
      .gte('closed_at', startMonth),
  ])

  const thisMonthTotal = (thisMonthInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const lastMonthTotal = (lastMonthInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const growthPct = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : null

  const statusCounts = (otsByStatus ?? []).reduce((acc: Record<string, number>, ot) => {
    acc[ot.status] = (acc[ot.status] ?? 0) + 1
    return acc
  }, {})

  const openOTs = (otsByStatus ?? []).filter(ot => !['closed', 'cancelled'].includes(ot.status)).length
  const avgTicket = (thisMonthInvoices ?? []).length > 0
    ? thisMonthTotal / (thisMonthInvoices ?? []).length
    : 0

  // Build per-technician stats: OT count + invoice revenue for closed OTs this month
  type TechRow = { name: string; otCount: number; revenue: number }
  const techMap = new Map<string, TechRow>()
  for (const ot of closedOTs ?? []) {
    const tid = ot.technician_id ?? '__unassigned__'
    const techProfile = ot.technician as { first_name: string; last_name: string | null } | null
    const name = techProfile
      ? `${techProfile.first_name}${techProfile.last_name ? ' ' + techProfile.last_name : ''}`.trim()
      : 'Sin asignar'
    const existing = techMap.get(tid) ?? { name, otCount: 0, revenue: 0 }
    const invoiceRevenue = ((ot.invoices as { total: number | null }[] | null) ?? [])
      .reduce((s, inv) => s + (inv.total ?? 0), 0)
    techMap.set(tid, { name, otCount: existing.otCount + 1, revenue: existing.revenue + invoiceRevenue })
  }
  const techStats = [...techMap.values()].sort((a, b) => b.otCount - a.otCount)

  const t = await getTranslations('reports')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Primary KPI tiles */}
      <div className="grid grid-cols-3 gap-5 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('thisMonth')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${thisMonthTotal.toLocaleString('es-CO')}</p>
          {growthPct !== null && (
            <p className={`text-xs mt-1 font-medium ${Number(growthPct) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {t('vsLastMonth', { sign: Number(growthPct) >= 0 ? '↑' : '↓', pct: Math.abs(Number(growthPct)) })}
            </p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('lastMonth')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${lastMonthTotal.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('paidInvoices', { n: (lastMonthInvoices ?? []).length })}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('otsThisMonth')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{(otsByStatus ?? []).length}</p>
          <p className="text-xs text-gray-400 mt-1">{t('otsClosed', { n: statusCounts['closed'] ?? 0 })}</p>
        </div>
      </div>

      {/* Secondary KPI tiles */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('openOTs')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{openOTs}</p>
          <p className="text-xs text-gray-400 mt-1">{t('otsClosed', { n: statusCounts['closed'] ?? 0 })}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('avgTicket')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${avgTicket.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('paidInvoices', { n: (thisMonthInvoices ?? []).length })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* OTs por estado */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">{t('otsByStatus')}</p>
          <div className="space-y-2">
            {Object.entries(statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status as WorkOrderStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[status as WorkOrderStatus] ?? status.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium text-gray-800">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Servicios más facturados */}
        {(topServices ?? []).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">{t('topServices')}</p>
            <div className="space-y-2">
              {(topServices ?? []).slice(0, 8).map((svc, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate max-w-48">{svc.description}</span>
                  <span className="font-medium text-gray-800">${(svc.subtotal ?? 0).toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Productividad técnicos */}
      {techStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">{t('techProductivity')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">{t('techName')}</th>
                  <th className="text-right pb-2 font-medium">{t('otsClosedLabel')}</th>
                  <th className="text-right pb-2 font-medium">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {techStats.map((tech, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-700 font-medium">{tech.name}</td>
                    <td className="py-2 text-right text-gray-800">{tech.otCount}</td>
                    <td className="py-2 text-right text-gray-800">${tech.revenue.toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
