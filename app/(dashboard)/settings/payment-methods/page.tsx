import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { upsertPaymentMethod, togglePaymentMethod } from './actions'
import { getTranslations } from 'next-intl/server'

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
  const t = await getTranslations('settings')

  const TYPES = [
    { value: 'cash',     label: t('paymentMethods.types.cash') },
    { value: 'card',     label: t('paymentMethods.types.card') },
    { value: 'transfer', label: t('paymentMethods.types.transfer') },
    { value: 'qr',       label: t('paymentMethods.types.digital') },
    { value: 'other',    label: t('paymentMethods.types.other') },
  ]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">{t('paymentMethods.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('paymentMethods.title')}</h1>
        {!showForm && (
          <Link href="/settings/payment-methods?new=1"
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {t('paymentMethods.new')}
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-700 mb-4">{editId ? t('paymentMethods.editTitle') : t('paymentMethods.newTitle')}</p>
          <form action={upsertPaymentMethod} className="space-y-4">
            {editId && <input type="hidden" name="id" value={editId} />}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('paymentMethods.name')}</label>
                <input name="name" required defaultValue={editMethod?.name ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Efectivo" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('paymentMethods.type')}</label>
                <select name="type" defaultValue={editMethod?.type ?? 'other'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                  {TYPES.map(typeItem => <option key={typeItem.value} value={typeItem.value}>{typeItem.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {editId ? t('paymentMethods.save') : t('paymentMethods.create')}
              </button>
              <Link href="/settings/payment-methods"
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {t('paymentMethods.cancel')}
              </Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!methods || methods.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">{t('paymentMethods.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('paymentMethods.table.name')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('paymentMethods.table.type')}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{t('paymentMethods.table.status')}</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {methods.map((m: any) => (
                <tr key={m.id} className={`border-b border-gray-50 ${!m.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {TYPES.find(typeItem => typeItem.value === m.type)?.label ?? m.type}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form action={togglePaymentMethod}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="is_active" value={String(m.is_active)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {m.is_active ? t('paymentMethods.active') : t('paymentMethods.inactive')}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/settings/payment-methods?edit=${m.id}`} className="text-xs text-slate-500 hover:underline">{t('paymentMethods.edit')}</Link>
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
