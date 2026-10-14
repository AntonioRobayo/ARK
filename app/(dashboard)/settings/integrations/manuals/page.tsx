import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ManualsClient } from './ManualsClient'

export default async function ManualsPage() {
  const t = await getTranslations('settings.manuals')
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
    .select('gdrive_enabled')
    .eq('id', profile!.tenant_id)
    .single()

  const { data: attachments } = await supabase
    .from('work_order_drive_attachment')
    .select('id, section, drive_file_id, drive_thumb_url, original_name, mime_type, size_kb, created_at')
    .is('work_order_id', null)
    .is('vehicle_id', null)
    .ilike('section', 'manual_%')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/settings/integrations" className="text-gray-400 hover:text-gray-600 text-sm">{t('back')}</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {!tenant?.gdrive_enabled ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
          Debes <Link href="/settings/integrations" className="underline font-medium">{t('noDriveLink')}</Link> para gestionar los manuales.
        </div>
      ) : (
        <ManualsClient
          attachments={(attachments ?? []).map(a => ({
            ...a,
            sectionKey: a.section.replace('manual_', ''),
          }))}
        />
      )}
    </div>
  )
}
