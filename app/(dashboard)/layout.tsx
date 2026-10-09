import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import { LocaleSync } from '@/components/locale-sync'
import { LicenseBlockedScreen } from '@/components/license-blocked'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('first_name, last_name, is_platform_admin, locale, tenant_id')
    .eq('id', user.id)
    .single()

  // License check — skip for platform admins
  let licenseBlock: 'suspended' | 'expired' | null = null
  if (!profile?.is_platform_admin && profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('is_active, plan_expires_at, name')
      .eq('id', profile.tenant_id)
      .single()

    if (tenant) {
      if (!tenant.is_active) {
        licenseBlock = 'suspended'
      } else if (tenant.plan_expires_at) {
          const gracePeriodEnd = new Date(tenant.plan_expires_at)
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3)
          if (gracePeriodEnd < new Date()) licenseBlock = 'expired'
      }
    }
  }

  // Active announcements for tenant users (not superadmins)
  let announcements: { id: string; title: string; body: string; type: string }[] = []
  if (!profile?.is_platform_admin) {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('platform_announcements')
      .select('id, title, body, type')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('created_at', { ascending: false })
    announcements = (data ?? []) as typeof announcements
  }

  const ANN_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info:        { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: 'ℹ️' },
    warning:     { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠️' },
    maintenance: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '🔧' },
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F3F4F6', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <LocaleSync dbLocale={profile?.locale ?? 'es'} />
      <Sidebar
        firstName={profile?.first_name ?? user.email?.split('@')[0]}
        lastName={profile?.last_name ?? ''}
        email={user.email}
        isSuperadmin={profile?.is_platform_admin === true}
      />

      {/* Main — pt-14 on mobile for the fixed header */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {announcements.length > 0 && (
          <div className="px-4 pt-4 md:px-8 md:pt-6 space-y-2">
            {announcements.map(ann => {
              const s = ANN_STYLES[ann.type] ?? ANN_STYLES.info
              return (
                <div key={ann.id} className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
                  <span className="mr-2">{s.icon}</span>
                  <strong>{ann.title}</strong>
                  {ann.body && <span className="ml-2 opacity-80">{ann.body}</span>}
                </div>
              )
            })}
          </div>
        )}
        <div className="p-4 md:p-8">
          {licenseBlock ? <LicenseBlockedScreen type={licenseBlock} /> : children}
        </div>
      </main>
    </div>
  )
}
