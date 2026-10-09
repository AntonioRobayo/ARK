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
      } else if (tenant.plan_expires_at && new Date(tenant.plan_expires_at) < new Date()) {
        licenseBlock = 'expired'
      }
    }
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
        <div className="p-4 md:p-8">
          {licenseBlock ? <LicenseBlockedScreen type={licenseBlock} /> : children}
        </div>
      </main>
    </div>
  )
}
