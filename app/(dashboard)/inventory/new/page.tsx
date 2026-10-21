import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createItem } from '../actions'
import { getCatalog } from '@/lib/catalog'
import { CatalogCombobox } from '@/components/CatalogCombobox'

export default async function NewInventoryItemPage() {
  const t = await getTranslations('inventory')
  const itemTypes = await getCatalog('inventory_item_type')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      <form action={createItem} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">General</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.name')}</label>
            <input
              name="name"
              required
              placeholder="Filtro de aceite Honda"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.type')}</label>
              <CatalogCombobox
                name="type"
                options={itemTypes}
                defaultValue="part"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.unit')}</label>
              <input
                name="unit"
                defaultValue="und"
                placeholder={t('new.unitPlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.internalCode')}</label>
              <input
                name="internal_code"
                placeholder="REP-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.barcode')}</label>
              <input
                name="barcode"
                placeholder="7891234567890"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.description')}</label>
            <textarea
              name="description"
              rows={2}
              placeholder={t('new.descriptionPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Precios</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.salePrice')}</label>
              <input
                type="number"
                name="sale_price"
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.cost')}</label>
              <input
                type="number"
                name="cost_price"
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.minStock')}</label>
              <input
                type="number"
                name="min_stock"
                defaultValue="0"
                min="0"
                step="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
              <input
                type="number"
                name="initial_stock"
                defaultValue="0"
                min="0"
                step="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">El stock inicial se registra como un movimiento de entrada al almacén principal.</p>
        </div>

        <button
          type="submit"
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          {t('new.submit')}
        </button>
      </form>
    </div>
  )
}
