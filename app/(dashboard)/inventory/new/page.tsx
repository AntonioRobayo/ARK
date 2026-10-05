import Link from 'next/link'
import { createInventoryItem } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function NewInventoryItemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('inventory')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createInventoryItem} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.name')}</label>
            <input name="name" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Aceite 10W-40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.type')}</label>
            <select name="type"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="part">{t('types.part')}</option>
              <option value="consumable">{t('types.consumable')}</option>
              <option value="accessory">{t('types.accessory')}</option>
              <option value="tool">{t('types.tool')}</option>
              <option value="other">{t('types.other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.unit')}</label>
            <input name="unit_of_measure" defaultValue="und"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder={t('new.unitPlaceholder')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.internalCode')}</label>
            <input name="internal_code"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="REP-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.barcode')}</label>
            <input name="barcode"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="7701234567890" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.salePrice')}</label>
            <input name="sale_price" type="number" min="0" step="0.01" defaultValue="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.cost')}</label>
            <input name="cost_price" type="number" min="0" step="0.01" defaultValue="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.minStock')}</label>
            <input name="min_stock" type="number" min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.description')}</label>
          <textarea name="description" rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder={t('new.descriptionPlaceholder')} />
        </div>

        <button type="submit"
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          {t('new.submit')}
        </button>
      </form>
    </div>
  )
}
