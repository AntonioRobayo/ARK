import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'
import { getTranslations } from 'next-intl/server'

const STATUS_GROUP_DEFS = [
  { key: 'active',  tKey: 'tabs.active',    statuses: ['draft','received','in_diagnosis','quotation_sent','awaiting_authorization','authorized','in_execution'] },
  { key: 'blocked', tKey: 'tabs.blocked',   statuses: ['blocked_parts','blocked_technician','blocked_customer'] },
  { key: 'ready',   tKey: 'tabs.toDeliver', statuses: ['quality_control','ready_for_delivery','delivered_with_balance'] },
  { key: 'closed',  tKey: 'tabs.closed',    statuses: ['closed','cancelled','warranty'] },
]

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>
}) {
  const { group = 'active', q } = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('workOrders')

  const STATUS_GROUPS = STATUS_GROUP_DEFS.map(g => ({ ...g, label: t(g.tKey as Parameters<typeof t>[0]) }))
  const activeGroup = STATUS_GROUPS.find(g => g.key === group) ?? STATUS_GROUPS[0]

  // Conteos por grupo para las tabs
  const { data: allOrders } = await supabase
    .from('work_order')
    .select('status')

  const groupCounts = STATUS_GROUPS.reduce<Record<string, number>>((acc, g) => {
    acc[g.key] = (allOrders ?? []).filter(o => g.statuses.includes(o.status)).length
    return acc
  }, {})

  // Órdenes del grupo activo
  let query = supabase
    .from('work_order')
    .select(`
      id, number, status, priority, created_at, estimated_delivery_at,
      customer:customer_id(first_name, last_name, phone),
      vehicle:vehicle_id(plate, brand, model, year),
      technician:technician_id(first_name, last_name)
    `)
    .in('status', activeGroup.statuses)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`number.ilike.%${q}%`)
  }

  const { data: orders } = await query

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('count', { n: (allOrders ?? []).length })}</p>
        </div>
        <Link
          href="/work-orders/new"
          className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {t('newBtn')}
        </Link>
      </div>

      {/* Tabs por grupo */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_GROUPS.map(g => (
          <Link
            key={g.key}
            href={`/work-orders?group=${g.key}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              group === g.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {g.label}
            {groupCounts[g.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                group === g.key ? 'bg-slate-100 text-slate-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {groupCounts[g.key]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium text-gray-500">{t('empty')}</p>
          <Link href="/work-orders/new" className="text-slate-600 text-sm hover:underline mt-2 inline-block">
            {t('createFirst')}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.ot')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.status')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.vehicle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.customer')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.technician')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.priority')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ot: any) => (
                <tr key={ot.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/work-orders/${ot.id}`} className="font-mono font-semibold text-slate-800 hover:text-slate-600">
                      OT-{ot.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[ot.status as WorkOrderStatus]}`}>
                      {STATUS_LABEL[ot.status as WorkOrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{ot.vehicle?.plate ?? '—'}</div>
                    <div className="text-xs text-gray-400">{ot.vehicle?.brand} {ot.vehicle?.model} {ot.vehicle?.year}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{ot.customer?.first_name} {ot.customer?.last_name}</div>
                    <div className="text-xs text-gray-400">{ot.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ot.technician
                      ? `${ot.technician.first_name} ${ot.technician.last_name ?? ''}`
                      : <span className="text-gray-300">{t('unassigned')}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[ot.priority ?? 'normal']}`}>
                      {PRIORITY_LABEL[ot.priority ?? 'normal']}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(ot.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
