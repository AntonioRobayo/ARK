import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { upsertTaxRate, toggleTaxRate } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function TaxRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { new: isNew, edit: editId } = await searchParams
  const supabase = await createClient()

  const { data: taxes } = await supabase
    .from('tax_rate')
    .select('id, name, rate, is_default, is_active')
    .order('rate', { ascending: true })

  const editTax = editId ? (taxes ?? []).find((tax: any) => tax.id === editId) : null
  const showForm = isNew === '1' || editId
  const t = await getTranslations('settings')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">{t('taxes.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('taxes.title')}</h1>
        {!showForm && (
          <Link href="/settings/taxes?new=1"
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {t('taxes.new')}
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-700 mb-4">{editId ? t('taxes.editTitle') : t('taxes.newTitle')}</p>
          <form action={upsertTaxRate} className="space-y-4">
            {editId && <input type="hidden" name="id" value={editId} />}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('taxes.name')}</label>
                <input name="name" required defaultValue={editTax?.name ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="IVA 19%" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('taxes.percentage')}</label>
                <input name="rate" type="number" min="0" max="100" step="0.01" required defaultValue={editTax?.rate ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="19" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_default" id="is_default" defaultChecked={editTax?.is_default ?? false}
                className="rounded" />
              <label htmlFor="is_default" className="text-sm text-gray-600">{t('taxes.isDefault')}</label>
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {editId ? t('taxes.save') : t('taxes.create')}
              </button>
              <Link href="/settings/taxes"
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {t('taxes.cancel')}
              </Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!taxes || taxes.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">{t('taxes.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('taxes.table.name')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('taxes.table.rate')}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{t('taxes.table.default')}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{t('taxes.table.status')}</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {taxes.map((tax: any) => (
                <tr key={tax.id} className={`border-b border-gray-50 ${!tax.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{tax.name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{tax.rate}%</td>
                  <td className="px-4 py-3 text-center">
                    {tax.is_default && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t('taxes.defaultBadge')}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form action={toggleTaxRate}>
                      <input type="hidden" name="id" value={tax.id} />
                      <input type="hidden" name="is_active" value={String(tax.is_active)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tax.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        {tax.is_active ? t('taxes.active') : t('taxes.inactive')}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/settings/taxes?edit=${tax.id}`} className="text-xs text-slate-500 hover:underline">{t('taxes.edit')}</Link>
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
