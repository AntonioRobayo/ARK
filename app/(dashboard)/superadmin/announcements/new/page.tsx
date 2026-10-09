import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createAnnouncement } from '../actions'

export default async function NewAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('superadmin.announcements.new')

  return (
    <div className="max-w-lg">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/superadmin/announcements" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Los comunicados aparecen como banners en el dashboard de todos los talleres.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">Ejemplos de uso:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-600">
          <li><strong>Información:</strong> "Nueva función disponible: módulo de inventario"</li>
          <li><strong>Aviso:</strong> "Actualización de términos de uso a partir del 1 de noviembre"</li>
          <li><strong>Mantenimiento:</strong> "El sábado 25 de octubre de 2am a 4am el sistema estará en mantenimiento"</li>
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createAnnouncement} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldTitle')}</label>
          <input name="title" required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="Mantenimiento programado el sábado 12..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldBody')}</label>
          <textarea name="body" required rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            placeholder="Descripción detallada del anuncio..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldType')}</label>
          <select name="type"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="info">Información</option>
            <option value="warning">Aviso importante</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldStartsAt')}</label>
            <input name="starts_at" type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">{t('fieldEndsAt')}</label>
            <input name="ends_at" type="datetime-local"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}>
            {t('submitBtn')}
          </button>
          <Link href="/superadmin/announcements"
            className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
