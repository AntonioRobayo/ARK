import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { upsertPaymentMethod, togglePaymentMethod } from './actions'

const TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'qr', label: 'QR / Pago digital' },
  { value: 'other', label: 'Otro' },
]

export default async function PaymentMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { new: isNew, edit: editId } = await searchParams
  const supabase = await createClient()

  const { data: methods } = await supabase
    .from('payment_method')
    .select('id, name, type, is_active')
    .order('name', { ascending: true })

  const editMethod = editId ? (methods ?? []).find((m: any) => m.id === editId) : null
  const showForm = isNew === '1' || editId

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">← Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900">Métodos de pago</h1>
        {!showForm && (
          <Link href="/settings/payment-methods?new=1"
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo método
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-700 mb-4">{editId ? 'Editar método' : 'Nuevo método de pago'}</p>
          <form action={upsertPaymentMethod} className="space-y-4">
            {editId && <input type="hidden" name="id" value={editId} />}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input name="name" required defaultValue={editMethod?.name ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Efectivo" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select name="type" defaultValue={editMethod?.type ?? 'other'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {editId ? 'Guardar' : 'Crear'}
              </button>
              <Link href="/settings/payment-methods"
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!methods || methods.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">Sin métodos configurados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {methods.map((m: any) => (
                <tr key={m.id} className={`border-b border-gray-50 ${!m.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {TYPES.find(t => t.value === m.type)?.label ?? m.type}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form action={togglePaymentMethod}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="is_active" value={String(m.is_active)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {m.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/settings/payment-methods?edit=${m.id}`} className="text-xs text-slate-500 hover:underline">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
