import { createClient } from '@/lib/supabase/server'

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
  ] = await Promise.all([
    supabase.from('invoice').select('total').eq('status', 'paid').gte('created_at', startMonth),
    supabase.from('invoice').select('total').eq('status', 'paid').gte('created_at', startLastMonth).lte('created_at', endLastMonth),
    supabase.from('work_order').select('status'),
    supabase.from('quotation_item').select('description, quantity, subtotal, item_type').eq('item_type', 'service').order('subtotal', { ascending: false }).limit(10),
  ])

  const thisMonthTotal = (thisMonthInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const lastMonthTotal = (lastMonthInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const growthPct = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : null

  const statusCounts = (otsByStatus ?? []).reduce((acc: Record<string, number>, ot) => {
    acc[ot.status] = (acc[ot.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos este mes</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${thisMonthTotal.toLocaleString('es-CO')}</p>
          {growthPct !== null && (
            <p className={`text-xs mt-1 font-medium ${Number(growthPct) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {Number(growthPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(growthPct))}% vs mes anterior
            </p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos mes anterior</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${lastMonthTotal.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-400 mt-1">{(lastMonthInvoices ?? []).length} facturas pagadas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">OTs este mes</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{(otsByStatus ?? []).length}</p>
          <p className="text-xs text-gray-400 mt-1">{statusCounts['closed'] ?? 0} cerradas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Estados de OTs */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">OTs por estado</p>
          <div className="space-y-2">
            {Object.entries(statusCounts)
              .sort(([,a],[,b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-gray-800">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Servicios más vendidos */}
        {(topServices ?? []).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Servicios más facturados</p>
            <div className="space-y-2">
              {(topServices ?? []).slice(0, 8).map((svc: any, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate max-w-48">{svc.description}</span>
                  <span className="font-medium text-gray-800">${(svc.subtotal ?? 0).toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
