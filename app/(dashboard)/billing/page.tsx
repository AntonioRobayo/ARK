import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

const INVOICE_STATUS_CLS: Record<string, string> = {
  draft:           'bg-gray-50 text-gray-500',
  issued:          'bg-blue-50 text-blue-600',
  partially_paid:  'bg-amber-50 text-amber-600',
  paid:            'bg-emerald-50 text-emerald-600',
  cancelled:       'bg-red-50 text-red-500',
  void:            'bg-red-50 text-red-400',
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

  const t = await getTranslations('billing')
  const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
    draft:          { label: t('status.draft'),      cls: INVOICE_STATUS_CLS.draft },
    issued:         { label: t('status.issued'),     cls: INVOICE_STATUS_CLS.issued },
    partially_paid: { label: t('status.partial'),    cls: INVOICE_STATUS_CLS.partially_paid },
    paid:           { label: t('status.paid'),       cls: INVOICE_STATUS_CLS.paid },
    cancelled:      { label: t('status.cancelled'),  cls: INVOICE_STATUS_CLS.cancelled },
    void:           { label: t('status.voided'),     cls: INVOICE_STATUS_CLS.void },
  }

  const tabs = [
    { id: 'open',      label: t('tabs.open') },
    { id: 'paid',      label: t('tabs.paid') },
    { id: 'cancelled', label: t('tabs.cancelled') },
    { id: 'all',       label: t('tabs.all') },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('count', { n: invoices?.length ?? 0 })}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(tabItem => (
          <Link key={tabItem.id} href={`/billing?tab=${tabItem.id}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === tabItem.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tabItem.label}
          </Link>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-medium text-gray-500">{t('empty')}</p>
          <p className="text-sm mt-1">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.invoice')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.ot')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.customer')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('table.total')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('table.paid')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('table.balance')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('table.date')}</th>
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
