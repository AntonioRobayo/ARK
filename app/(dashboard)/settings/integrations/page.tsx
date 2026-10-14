import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { disconnectDrive } from './actions'

const QUOTA_WARN = 500 * 1024 * 1024
const QUOTA_BLOCK = 100 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const t = await getTranslations('settings.integrations')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('gdrive_enabled, gdrive_connected_email, gdrive_connected_at, gdrive_quota_warning, gdrive_root_folder_id')
    .eq('id', profile!.tenant_id)
    .single()

  let quota: { available: number; total: number; used: number } | null = null
  if (tenant?.gdrive_enabled) {
    try {
      const { getAccessToken, checkQuota } = await import('@/lib/google-drive')
      const token = await getAccessToken(profile!.tenant_id)
      quota = await checkQuota(token)
    } catch {
      // quota unavailable
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">{t('back')}</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {connected === '1' && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {t('successConnected')}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error === 'drive_denied' && t('errorDenied')}
          {error === 'drive_no_refresh_token' && t('errorNoRefresh')}
          {error === 'drive_token_failed' && t('errorTokenFailed')}
          {!['drive_denied', 'drive_no_refresh_token', 'drive_token_failed'].includes(error) && t('errorGeneric', { code: error })}
        </div>
      )}

      {/* Google Drive card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">
              <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{t('googleDriveTitle')}</p>
              <p className="text-sm text-gray-400">{t('googleDriveDesc')}</p>
            </div>
            <div className="ml-auto">
              {tenant?.gdrive_enabled ? (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-200">
                  {t('connected')}
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-gray-50 text-gray-400 text-xs font-semibold rounded-full border border-gray-200">
                  {t('notConnected')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!tenant?.gdrive_enabled ? (
            <>
              <p className="text-sm text-gray-500">
                {t('googleDriveDesc')}
              </p>
              <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                <li>{t('featureStructured')}</li>
                <li>{t('featureCompression')}</li>
                <li>{t('featureQuota')}</li>
                <li>{t('featureThumbnails')}</li>
              </ul>
              <a
                href="/api/auth/google"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('connectBtn')}
              </a>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{t('connectedAccount')}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate">
                    {tenant.gdrive_connected_email ?? '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{t('connectedAt')}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    {tenant.gdrive_connected_at
                      ? new Date(tenant.gdrive_connected_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              {quota && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{t('storageAvailable')}</span>
                    <span className={quota.available < QUOTA_BLOCK ? 'text-red-500 font-medium' : quota.available < QUOTA_WARN ? 'text-amber-500 font-medium' : ''}>
                      {t('storageFree', { free: formatBytes(quota.available), total: formatBytes(quota.total) })}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quota.available < QUOTA_BLOCK ? 'bg-red-400' :
                        quota.available < QUOTA_WARN ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (quota.used / quota.total) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  {quota.available < QUOTA_WARN && (
                    <p className={`text-xs mt-1 ${quota.available < QUOTA_BLOCK ? 'text-red-600' : 'text-amber-600'}`}>
                      {quota.available < QUOTA_BLOCK ? t('quotaCritical') : t('quotaLow')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <a href="/api/auth/google" className="text-sm text-blue-600 hover:underline">
                  {t('reconnectBtn')}
                </a>
                <form action={disconnectDrive}>
                  <button type="submit" className="text-sm text-red-500 hover:underline">
                    {t('disconnectBtn')}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {tenant?.gdrive_enabled && (
        <Link
          href="/settings/integrations/manuals"
          className="mt-4 flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">
            📚
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 group-hover:text-slate-700">{t('manualsTitle')}</p>
            <p className="text-sm text-gray-400 mt-0.5">{t('manualsDesc')}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 flex-shrink-0">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      )}
    </div>
  )
}
