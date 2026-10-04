import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  draft:           { label: 'Borrador',            cls: 'bg-gray-50 text-gray-500' },
  issued:          { label: 'Emitida',              cls: 'bg-blue-50 text-blue-600' },
  partially_paid:  { label: 'Pago parcial',         cls: 'bg-amber-50 text-amber-600' },
  paid:            { label: 'Pagada',               cls: 'bg-emerald-50 text-emerald-600' },
  cancelled:       { label: 'Cancelada',            cls: 'bg-red-50 text-red-500' },
  void:            { label: 'Anulada',              cls: 'bg-red-50 text-red-400' },
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'open' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('invoice')
    .select(`
      id, number, status, total, paid_amount, issued_at, created_at,
      work_order:work_order_id(number),
      customer:work_order_id(customer:customer_id(first_name, last_name))
    `)
    .order('created_at', { ascending: false })

  if (tab === 'open') query = query.in('status', ['issued', 'partially_paid', 'draft'])
  else if (tab === 'paid') query = query.eq('status', 'paid')
  else if (tab === 'cancelled') query = query.in('status', ['cancelled', 'void'])

  const { data: invoices } = await query.limit(50)

  const tabs = [
    { id: 'open',      label: 'Abiertas' },
    { id: 'paid',      label: 'Pagadas' },
    { id: 'cancelled', label: 'Canceladas' },
    { id: 'all',       label: 'Todas' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices?.length ?? 0} registros</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <Link key={t.id} href={`/billing?tab=${t.id}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-medium text-gray-500">No hay facturas en esta categoría</p>
          <p className="text-sm mt-1">Las facturas se crean desde una OT con cotización aprobada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Factura</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">OT</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Pagado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Saldo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const saldo = (inv.total ?? 0) - (inv.paid_amount ?? 0)
                const s = INVOICE_STATUS[inv.status] ?? { label: inv.status, cls: 'bg-gray-50 text-gray-500' }
                const customer = inv.customer?.customer
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/billing/${inv.id}`} className="font-mono font-bold text-gray-800 hover:text-slate-600">
                        FAC-{inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.work_order ? `OT-${inv.work_order.number}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      ${(inv.total ?? 0).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      ${(inv.paid_amount ?? 0).toLocaleString('es-CO')}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${saldo > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      ${saldo.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(inv.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
