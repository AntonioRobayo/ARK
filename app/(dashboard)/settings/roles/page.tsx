import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { checkPermission } from '@/lib/permissions'
import { toggleUserPermission } from './actions'

const MODULE_LABELS: Record<string, string> = {
  users:     'Usuarios',
  ot:        'Órdenes de Trabajo',
  inventory: 'Inventario',
  billing:   'Facturación',
  customers: 'Clientes',
  reports:   'Reportes',
  config:    'Configuración',
}

const ROLE_LABELS: Record<string, string> = {
  owner:        '👑 Dueño',
  shop_manager: '🔧 Gerente',
  mechanic:     '🔩 Mecánico',
  receptionist: '📋 Recepcionista',
  parts_manager:'📦 Líder Repuestos',
  accountant:   '📊 Contador',
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; user?: string }>
}) {
  const { error, success, user: selectedUserId } = await searchParams

  const canManage = await checkPermission('users.manage_roles')
  if (!canManage) redirect('/settings')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const { data: myProfile } = await adminClient
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!myProfile?.tenant_id) redirect('/settings')

  // Fetch all permissions grouped by module
  const { data: allPerms } = await adminClient
    .from('permission')
    .select('id, code, module, description')
    .order('module')
    .order('code')

  // Fetch tenant roles with their permission codes
  const { data: roles } = await adminClient
    .from('role')
    .select('id, name, description, is_system, role_permission(permission_id)')
    .eq('tenant_id', myProfile.tenant_id)
    .is('deleted_at', null)
    .order('name')

  // Fetch all members for individual overrides section
  const { data: members } = await adminClient
    .from('user_profile')
    .select('id, first_name, last_name, role')
    .eq('tenant_id', myProfile.tenant_id)
    .eq('is_active', true)
    .order('first_name')

  const { data: usersAuth } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = Object.fromEntries(
    (usersAuth?.users ?? []).map(u => [u.id, u.email ?? ''])
  )

  // Fetch overrides only for the selected user
  const { data: selectedUserPermissions } = selectedUserId
    ? await adminClient
        .from('user_permission')
        .select('permission_id, granted')
        .eq('user_id', selectedUserId)
    : { data: null }

  // Group permissions by module
  const byModule: Record<string, typeof allPerms> = {}
  for (const p of allPerms ?? []) {
    if (!byModule[p.module]) byModule[p.module] = []
    byModule[p.module]!.push(p)
  }

  // Build permission set per role for fast lookup
  const rolePermSet: Record<string, Set<string>> = {}
  for (const r of roles ?? []) {
    rolePermSet[r.id] = new Set((r.role_permission ?? []).map((rp: { permission_id: string }) => rp.permission_id))
  }

  // Selected member for override panel
  const selectedMember = selectedUserId
    ? (members ?? []).find(m => m.id === selectedUserId)
    : null

  const selectedOverrides: Record<string, boolean> = {}
  for (const up of (selectedUserPermissions ?? []) as Array<{ permission_id: string; granted: boolean }>) {
    selectedOverrides[up.permission_id] = up.granted
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Roles y Permisos</h1>
          <p className="text-sm text-gray-400">Qué puede hacer cada rol, y ajustes individuales por usuario</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          Cambios guardados correctamente
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* ── ROLES MATRIX ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Matriz de permisos por rol</h2>
          <p className="text-xs text-gray-400 mt-0.5">Los roles del sistema no pueden eliminarse. Puedes ajustar permisos individualmente por usuario abajo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 w-56">Permiso</th>
                {(roles ?? []).filter(r => ROLE_LABELS[r.name]).map(r => (
                  <th key={r.id} className="px-3 py-2.5 font-semibold text-gray-600 text-center whitespace-nowrap">
                    {ROLE_LABELS[r.name] ?? r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byModule).map(([mod, perms]) => (
                <>
                  <tr key={`mod-${mod}`} className="bg-gray-50">
                    <td colSpan={(roles ?? []).filter(r => ROLE_LABELS[r.name]).length + 1}
                        className="px-4 py-1.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                      {MODULE_LABELS[mod] ?? mod}
                    </td>
                  </tr>
                  {(perms ?? []).map(p => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-700">{p.description}</td>
                      {(roles ?? []).filter(r => ROLE_LABELS[r.name]).map(r => (
                        <td key={r.id} className="px-3 py-2 text-center">
                          {rolePermSet[r.id]?.has(p.id) ? (
                            <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[10px] leading-4 font-bold">✓</span>
                          ) : (
                            <span className="inline-block w-4 h-4 rounded-full bg-gray-100 text-gray-300 text-[10px] leading-4">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PER-USER OVERRIDES ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Ajustes individuales por usuario</h2>
          <p className="text-xs text-gray-400 mt-0.5">Concede o revoca permisos específicos a un usuario, independientemente de su rol.</p>
        </div>

        {/* User picker */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-2">
          {(members ?? []).map(m => {
            const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || emailMap[m.id] || '?'
            const isSelected = m.id === selectedUserId
            return (
              <Link
                key={m.id}
                href={isSelected ? '/settings/roles' : `/settings/roles?user=${m.id}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'border-orange-300 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {name}
              </Link>
            )
          })}
        </div>

        {selectedMember ? (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Overrides para {[selectedMember.first_name, selectedMember.last_name].filter(Boolean).join(' ') || emailMap[selectedMember.id]}
              {' · '}
              <span className="text-gray-400 normal-case font-normal">
                {ROLE_LABELS[selectedMember.role ?? ''] ?? selectedMember.role ?? 'Sin rol'}
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {(allPerms ?? []).map(p => {
                const override = selectedOverrides[p.id]
                return (
                  <form key={p.id} action={toggleUserPermission} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <input type="hidden" name="user_id" value={selectedMember.id} />
                    <input type="hidden" name="permission_id" value={p.id} />
                    <input type="hidden" name="redirect_user" value={selectedMember.id} />
                    <span className="text-xs text-gray-700">{p.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="submit"
                        name="action"
                        value="grant"
                        title="Conceder siempre"
                        className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                          override === true
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                        }`}
                      >
                        ✓
                      </button>
                      <button
                        type="submit"
                        name="action"
                        value="revoke"
                        title="Revocar siempre"
                        className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                          override === false
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'
                        }`}
                      >
                        ✕
                      </button>
                      {override !== undefined && override !== null && (
                        <button
                          type="submit"
                          name="action"
                          value="clear"
                          title="Quitar override (usar rol)"
                          className="w-6 h-6 rounded text-[10px] text-gray-400 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </form>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Selecciona un usuario para ver o ajustar sus permisos individuales
          </div>
        )}
      </div>
    </div>
  )
}
