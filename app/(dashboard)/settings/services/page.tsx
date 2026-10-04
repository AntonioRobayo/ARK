import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { upsertService, toggleService } from './actions'

export default async function ServiceCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { new: isNew, edit: editId } = await searchParams
  const supabase = await createClient()

  const { data: services } = await supabase
    .from('service_catalog')
    .select('id, name, description, category, base_price, estimated_minutes, warranty_days, is_active')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  let editService = null
  if (editId) {
    editService = (services ?? []).find((s: any) => s.id === editId) ?? null
  }

  const showForm = isNew === '1' || editId

  const categories = [...new Set((services ?? []).map((s: any) => s.category).filter(Boolean))]

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">← Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de servicios</h1>
        {!showForm && (
          <Link href="/settings/services?new=1"
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo servicio
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-700 mb-4">{editId ? 'Editar servicio' : 'Nuevo servicio'}</p>
          <form action={upsertService} className="space-y-4">
            {editId && <input type="hidden" name="id" value={editId} />}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input name="name" required defaultValue={editService?.name ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Cambio de aceite" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                <input name="category" list="categories" defaultValue={editService?.category ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Mantenimiento" />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c as string} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <textarea name="description" rows={2} defaultValue={editService?.description ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                placeholder="Descripción del servicio..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio base</label>
                <input name="base_price" type="number" min="0" step="0.01" defaultValue={editService?.base_price ?? 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tiempo estimado (min)</label>
                <input name="estimated_minutes" type="number" min="0" defaultValue={editService?.estimated_minutes ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="60" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Garantía (días)</label>
                <input name="warranty_days" type="number" min="0" defaultValue={editService?.warranty_days ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="30" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {editId ? 'Guardar cambios' : 'Crear servicio'}
              </button>
              <Link href="/settings/services"
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}

      {!services || services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔧</p>
          <p>Sin servicios aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Tiempo</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {services.map((svc: any) => (
                <tr key={svc.id} className={`border-b border-gray-50 ${!svc.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{svc.name}</p>
                    {svc.description && <p className="text-xs text-gray-400 truncate max-w-xs">{svc.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{svc.category ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    ${(svc.base_price ?? 0).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {svc.estimated_minutes ? `${svc.estimated_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form action={toggleService}>
                      <input type="hidden" name="id" value={svc.id} />
                      <input type="hidden" name="is_active" value={String(svc.is_active)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        svc.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        {svc.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/settings/services?edit=${svc.id}`} className="text-xs text-slate-500 hover:underline">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
