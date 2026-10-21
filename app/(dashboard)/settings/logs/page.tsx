import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { checkPermission } from '@/lib/permissions'

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  INSERT: { label: 'Creado',    cls: 'bg-emerald-50 text-emerald-700' },
  UPDATE: { label: 'Modificado', cls: 'bg-blue-50 text-blue-700' },
  DELETE: { label: 'Eliminado', cls: 'bg-red-50 text-red-600' },
}

const TABLE_LABELS: Record<string, string> = {
  user_permission:      'Permiso de usuario',
  user_profile:         'Perfil de usuario',
  user_tenant_membership: 'Membresía',
  work_order:           'Orden de trabajo',
  invoice:              'Factura',
  customer:             'Cliente',
  vehicle:              'Vehículo',
  inventory_item:       'Inventario',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const PAGE_SIZE = 50

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>
}) {
  const { page: pageParam, table: tableFilter } = await searchParams

  const canView = await checkPermission('config.manage')
  if (!canView) redirect('/settings')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const { data: myProfile } = await adminClient
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!myProfile?.tenant_id) redirect('/settings')

  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = adminClient
    .from('audit_log')
    .select('id, table_name, action, old_values, new_values, performed_by, created_at', { count: 'exact' })
    .eq('tenant_id', myProfile.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (tableFilter) query = query.eq('table_name', tableFilter)

  const { data: logs, count } = await query

  // Resolve performer names
  const performerIds = [...new Set((logs ?? []).map(l => l.performed_by).filter(Boolean))]
  const { data: profiles } = performerIds.length
    ? await adminClient
        .from('user_profile')
        .select('id, first_name, last_name')
        .in('id', performerIds)
    : { data: [] }

  const nameMap: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map(p => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id,
    ])
  )

  // Distinct tables for filter dropdown
  const { data: tableRows } = await adminClient
    .from('audit_log')
    .select('table_name')
    .eq('tenant_id', myProfile.tenant_id)

  const distinctTables = [...new Set((tableRows ?? []).map(r => r.table_name))].sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Registro de actividad</h1>
            <p className="text-sm text-gray-400">Historial de cambios realizados en el taller</p>
          </div>
        </div>

        {/* Table filter */}
        <form method="GET">
          <select
            name="table"
            defaultValue={tableFilter ?? ''}
            onChange={undefined}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
            onInput={undefined}
          >
            <option value="">Todos los módulos</option>
            {distinctTables.map(t => (
              <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <button
            type="submit"
            className="ml-2 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Log table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {(logs ?? []).length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">
            No hay registros de actividad aún
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Módulo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acción</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map(log => {
                const actionMeta = ACTION_LABELS[log.action] ?? { label: log.action, cls: 'bg-gray-100 text-gray-600' }
                const performer  = nameMap[log.performed_by] ?? '—'
                const module     = TABLE_LABELS[log.table_name] ?? log.table_name

                // Build a human-readable detail from new_values / old_values
                const detail = buildDetail(log.table_name, log.action, log.old_values, log.new_values)

                return (
                  <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">
                      {performer}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {module}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${actionMeta.cls}`}>
                        {actionMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">
                      {detail}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{count} registros · página {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/settings/logs?page=${page - 1}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/settings/logs?page=${page + 1}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function buildDetail(
  table: string,
  action: string,
  oldVals: Record<string, unknown> | null,
  newVals: Record<string, unknown> | null,
): string {
  const vals = action === 'DELETE' ? oldVals : newVals
  if (!vals) return '—'

  if (table === 'user_permission') {
    if (action === 'DELETE') return 'Override eliminado'
    const granted = vals['granted']
    return granted === true ? 'Permiso forzado activo' : 'Permiso revocado'
  }

  // Generic: show changed keys
  if (action === 'UPDATE' && oldVals && newVals) {
    const changed = Object.keys(newVals).filter(
      k => JSON.stringify(newVals[k]) !== JSON.stringify(oldVals[k])
    )
    if (changed.length) return `Campos: ${changed.join(', ')}`
  }

  const keys = Object.keys(vals).slice(0, 3)
  return keys.map(k => `${k}: ${String(vals[k] ?? '').slice(0, 30)}`).join(' · ')
}
