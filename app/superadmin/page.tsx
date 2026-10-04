import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const PLAN_COLORS: Record<string, string> = {
  starter:      'bg-gray-100 text-gray-600',
  professional: 'bg-blue-50 text-blue-600',
  enterprise:   'bg-purple-50 text-purple-600',
}

function PlanBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[slug] ?? 'bg-gray-100 text-gray-600'}`}>
      {name}
    </span>
  )
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-xs text-gray-400">Sin vencimiento</span>
  const date = new Date(expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft < 0
  const isWarning = daysLeft >= 0 && daysLeft <= 14

  return (
    <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-500'}`}>
      {isExpired
        ? `Vencido hace ${Math.abs(daysLeft)}d`
        : isWarning
          ? `Vence en ${daysLeft}d`
          : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
}

export default async function SuperAdminPage() {
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, plan_id, plan_expires_at, is_active, created_at, license_plan(name, slug)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{tenants?.length ?? 0} talleres registrados</p>
        <Link
          href="/superadmin/tenants/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo taller
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Taller</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Slug</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Licencia</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Creado</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{t.name}</td>
                <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{t.slug}</td>
                <td className="px-5 py-3.5">
                  {t.license_plan
                    ? <PlanBadge name={(t.license_plan as { name: string; slug: string }).name} slug={(t.license_plan as { name: string; slug: string }).slug} />
                    : <PlanBadge name={t.plan ?? '—'} slug={t.plan ?? ''} />
                  }
                </td>
                <td className="px-5 py-3.5"><ExpiryBadge expiresAt={t.plan_expires_at} /></td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${t.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    {t.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString('es-CO')}
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">No hay talleres registrados aún</p>
                  <p className="text-xs mt-1 text-gray-300">Crea el primero con "+ Nuevo taller"</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
