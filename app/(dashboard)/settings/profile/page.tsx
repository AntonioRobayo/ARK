import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { updateProfile, switchTenant } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('first_name, last_name, phone, tenant_id')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()
  const { data: memberships } = await adminClient
    .from('user_tenant_membership')
    .select('tenant_id, tenants(name, slug)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const t = await getTranslations('settings.profile')

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400">{t('subtitle')}</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {t('saved')}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Personal info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('email')}</p>
          <p className="text-sm text-gray-700">{user.email}</p>
        </div>

        <form action={updateProfile} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('firstName')} <span className="text-red-400">*</span>
              </label>
              <input
                name="first_name"
                type="text"
                defaultValue={profile?.first_name ?? ''}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('lastName')}
              </label>
              <input
                name="last_name"
                type="text"
                defaultValue={profile?.last_name ?? ''}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="García"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('phone')}
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={profile?.phone ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>

      {/* Workshops */}
      {memberships && memberships.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">{t('workshops')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('workshopsDesc')}</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {memberships.map(m => {
              const tenant = m.tenants as unknown as { name: string; slug: string } | null
              const isActive = m.tenant_id === profile?.tenant_id
              return (
                <li key={m.tenant_id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tenant?.name ?? m.tenant_id}</p>
                    <p className="text-xs text-gray-400 font-mono">{tenant?.slug}</p>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      {t('active')}
                    </span>
                  ) : (
                    <form action={switchTenant}>
                      <input type="hidden" name="tenant_id" value={m.tenant_id} />
                      <button
                        type="submit"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {t('switch')}
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
