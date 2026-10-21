import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { connectDrive, disconnectDrive } from './actions'

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''

const ERROR_MAP: Record<string, string> = {
  no_permission:          'errorNoPermission',
  no_url:                 'errorNoUrl',
  invalid_url:            'errorInvalidUrl',
  folder_not_accessible:  'errorFolderNotAccessible',
  service_account_error:  'errorServiceAccount',
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
    .select('gdrive_enabled, gdrive_connected_email, gdrive_connected_at, gdrive_root_folder_id')
    .eq('id', profile!.tenant_id)
    .single()

  const errorKey = error ? (ERROR_MAP[error] ?? null) : null
  const errorMsg = errorKey ? t(errorKey as Parameters<typeof t>[0]) : error ? decodeURIComponent(error) : null

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
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Google Drive card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
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

        <div className="p-5">
          {!tenant?.gdrive_enabled ? (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">{t('shareIntro')}</p>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-sm text-amber-800 leading-relaxed">
                <p>
                  <strong>Nota importante:</strong> ARK guardará los soportes automáticamente en esta carpeta, pero <strong>no se hace responsable por la disponibilidad, modificación o eliminación de archivos</strong>, ya que el repositorio es propiedad del taller y puede ser administrado externamente. Esta integración es una solución opcional para reducir costos de almacenamiento.
                </p>
              </div>

              {/* Steps */}
              <ol className="space-y-5">
                {/* Step 1 */}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Crea una carpeta en Google Drive</p>
                    <p className="text-xs text-gray-400 mt-0.5">Abre <strong>drive.google.com</strong>, haz clic en <strong>+ Nuevo → Carpeta</strong> y dale un nombre (ej: <em>ARK Workshop — Soportes</em>).</p>
                  </div>
                </li>

                {/* Step 2 — share */}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1.5">Comparte la carpeta con ARK <span className="text-red-500 font-semibold">(no la hagas pública)</span></p>
                    <p className="text-xs text-gray-500 mb-2">
                      Haz clic derecho sobre la carpeta → <strong>Compartir → Compartir</strong>. En el campo <em>"Agregar personas o grupos"</em> pega este correo y selecciona rol <strong>Editor</strong>:
                    </p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2">
                      <code className="text-sm text-gray-800 flex-1 select-all break-all">{SERVICE_ACCOUNT_EMAIL || 'socialdevasconfirm@gmail.com'}</code>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 space-y-1">
                      <p>✅ <strong>Acceso correcto:</strong> "Compartir con personas específicas" → rol <strong>Editor</strong></p>
                      <p>❌ <strong>No uses:</strong> "Cualquier persona con el enlace" ni <strong>Lector</strong></p>
                    </div>
                  </div>
                </li>

                {/* Step 3 */}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Copia el enlace de la carpeta</p>
                    <p className="text-xs text-gray-400 mt-0.5">Clic derecho sobre la carpeta → <strong>Copiar enlace</strong>. El enlace tiene el formato <code className="bg-gray-100 px-1 rounded">drive.google.com/drive/folders/…</code></p>
                  </div>
                </li>

                {/* Step 4 — paste link */}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">4</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">Pega el enlace aquí y haz clic en <strong>Verificar acceso</strong></p>
                    <form action={connectDrive} className="flex gap-2">
                      <input
                        type="url"
                        name="folder_url"
                        required
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {t('verifyBtn')}
                      </button>
                    </form>
                  </div>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
                <strong>Nota:</strong> ARK no se hace responsable por la disponibilidad, modificación o eliminación de archivos en esta carpeta. El repositorio es propiedad del taller.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{t('folderName')}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate">
                    📁 {tenant.gdrive_connected_email ?? '—'}
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

              <div className="flex gap-3 pt-1">
                <form action={disconnectDrive}>
                  <button type="submit" className="text-sm text-red-500 hover:underline">
                    {t('disconnectBtn')}
                  </button>
                </form>
              </div>
            </div>
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
