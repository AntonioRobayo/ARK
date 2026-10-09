import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { toggleAnnouncement } from './actions'

const TYPE_COLORS: Record<string, string> = {
  info:        'bg-blue-50 text-blue-700',
  warning:     'bg-amber-50 text-amber-700',
  maintenance: 'bg-red-50 text-red-700',
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const adminClient = createAdminClient()
  const t = await getTranslations('superadmin.announcements')

  const { data: announcements } = await adminClient
    .from('platform_announcements')
    .select('id, title, body, type, starts_at, ends_at, is_active, created_at')
    .order('created_at', { ascending: false })

  const now = new Date()

  return (
    <div>
      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{t('count', { n: announcements?.length ?? 0 })}</p>
        <Link href="/superadmin/announcements/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('newBtn')}
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('table.title')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('table.type')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('table.dates')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('table.status')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(announcements ?? []).map(ann => {
              const isExpired = ann.ends_at && new Date(ann.ends_at) < now
              const effectivelyActive = ann.is_active && !isExpired
              return (
                <tr key={ann.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{ann.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{ann.body}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[ann.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(`types.${ann.type}` as never)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    <span>{new Date(ann.starts_at).toLocaleDateString('es-CO')}</span>
                    {ann.ends_at && <span> → {new Date(ann.ends_at).toLocaleDateString('es-CO')}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${effectivelyActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${effectivelyActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      {effectivelyActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <form action={toggleAnnouncement}>
                      <input type="hidden" name="id" value={ann.id} />
                      <input type="hidden" name="is_active" value={String(ann.is_active)} />
                      <button type="submit"
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          ann.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}>
                        {ann.is_active ? t('deactivate') : t('activate')}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {(!announcements || announcements.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                  {t('empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
