import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/work-order-utils'
import type { WorkOrderStatus } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: otStats },
    { data: recentOTs },
    { data: revenueData },
    { data: pendingInvoices },
  ] = await Promise.all([
    supabase.from('work_order').select('status'),
    supabase.from('work_order')
      .select('id, number, status, priority, created_at, customer:customer_id(first_name, last_name), vehicle:vehicle_id(plate, brand, model)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('invoice')
      .select('total, paid_amount')
      .gte('created_at', startOfMonth)
      .eq('status', 'paid'),
    supabase.from('invoice')
      .select('id, number, total, paid_amount, status')
      .in('status', ['issued', 'partially_paid'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const active   = (otStats ?? []).filter(o => !['closed','cancelled'].includes(o.status)).length
  const ready    = (otStats ?? []).filter(o => ['ready_for_delivery','quality_control'].includes(o.status)).length
  const blocked  = (otStats ?? []).filter(o => o.status.startsWith('blocked')).length
  const monthRev = (revenueData ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const pendingBalance = (pendingInvoices ?? []).reduce((s, i) => s + ((i.total ?? 0) - (i.paid_amount ?? 0)), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <Link href="/work-orders?group=active" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide">OTs activas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{active}</p>
          {blocked > 0 && <p className="text-xs text-red-500 mt-1">{blocked} bloqueadas</p>}
        </Link>
        <Link href="/work-orders?group=ready" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Por entregar</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{ready}</p>
          {ready > 0 && <p className="text-xs text-emerald-500 mt-1">Listas para cliente</p>}
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos del mes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${monthRev.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-gray-400 mt-1">{(revenueData ?? []).length} facturas pagadas</p>
        </div>
        <Link href="/billing" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Saldo pendiente</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            ${pendingBalance.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-gray-400 mt-1">{(pendingInvoices ?? []).length} facturas abiertas</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Últimas OTs */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Últimas órdenes de trabajo</p>
            <Link href="/work-orders" className="text-xs text-slate-500 hover:underline">Ver todas →</Link>
          </div>
          {!recentOTs || recentOTs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Sin órdenes aún</p>
          ) : (
            <div className="space-y-2">
              {recentOTs.map((ot: any) => (
                <Link key={ot.id} href={`/work-orders/${ot.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-800">OT-{ot.number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ot.status as WorkOrderStatus]}`}>
                      {STATUS_LABEL[ot.status as WorkOrderStatus]}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-700">{ot.vehicle?.plate} · {ot.customer?.first_name} {ot.customer?.last_name}</p>
                    <p className="text-xs text-gray-400">{new Date(ot.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Acciones rápidas</p>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {[
                { href: '/work-orders/new',  label: 'Nueva OT',         icon: '📋' },
                { href: '/customers/new',    label: 'Nuevo cliente',    icon: '👤' },
                { href: '/vehicles/new',     label: 'Nuevo vehículo',   icon: '🏍' },
                { href: '/appointments/new', label: 'Nueva cita',       icon: '📅' },
                { href: '/inventory/new',    label: 'Nuevo ítem',       icon: '📦' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-slate-300 hover:bg-gray-50 transition-all text-sm text-gray-700">
                  <span className="text-lg leading-none">{a.icon}</span>
                  <span className="font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {(pendingInvoices ?? []).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">Facturas pendientes</p>
              {pendingInvoices!.map((inv: any) => (
                <Link key={inv.id} href={`/billing/${inv.id}`}
                  className="flex justify-between text-xs py-1 text-amber-800 hover:text-amber-600">
                  <span>#{inv.number}</span>
                  <span>${((inv.total ?? 0) - (inv.paid_amount ?? 0)).toLocaleString('es-CO')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
