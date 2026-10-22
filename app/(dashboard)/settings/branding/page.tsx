import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { saveBranding, removeLogo } from './actions'

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profile').select('tenant_id').eq('id', user.id).single()

  const { data: tenant } = await admin
    .from('tenants').select('name, settings').eq('id', profile?.tenant_id ?? '').single()

  const settings = (tenant?.settings ?? {}) as Record<string, string>
  const logoUrl = settings.logo_url ?? null
  const tc = settings.terms_and_conditions ?? ''

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Marca e identidad</h1>
          <p className="text-sm text-gray-400">Logo y términos que aparecen en cotizaciones y correos</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          Cambios guardados correctamente.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={saveBranding} encType="multipart/form-data" className="space-y-5">
        {/* Logo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">Logo del taller</p>
          <p className="text-xs text-gray-400 mb-4">PNG, JPG, WebP o SVG · máx. 2 MB · recomendado 400 × 120 px sobre fondo oscuro</p>

          <div className="flex items-start gap-5">
            {/* Preview */}
            <div className="flex-shrink-0 w-40 h-16 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden border border-gray-700">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo actual" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <span className="text-xs text-gray-500">Sin logo</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Subir nuevo logo</label>
                <input
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full text-sm text-gray-500
                    file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border file:border-gray-200
                    file:text-xs file:font-medium file:text-gray-700
                    file:bg-white file:cursor-pointer
                    hover:file:bg-gray-50 file:transition-colors"
                />
              </div>
              {logoUrl && (
                <form action={removeLogo}>
                  <button type="submit" className="text-xs text-red-500 hover:text-red-700 underline">
                    Eliminar logo actual
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Términos y condiciones */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">Términos y condiciones</p>
          <p className="text-xs text-gray-400 mb-3">
            Se incluyen al pie de cada cotización enviada por correo. Usa texto plano.
          </p>
          <textarea
            name="terms_and_conditions"
            rows={6}
            defaultValue={tc}
            placeholder="Ej: Esta cotización tiene validez de 15 días. Los precios pueden variar según disponibilidad de repuestos. El tiempo de entrega es estimado..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-400 resize-y"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Máx. recomendado: 3–5 líneas.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
