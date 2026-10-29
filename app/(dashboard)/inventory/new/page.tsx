import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createItem } from '../actions'
import { getCatalog } from '@/lib/catalog'
import { CatalogCombobox } from '@/components/CatalogCombobox'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function NewInventoryItemPage() {
  const t = await getTranslations('inventory')
  const [itemTypes, { data: units }] = await Promise.all([
    getCatalog('inventory_item_type'),
    createAdminClient().from('unit_catalog').select('id, key, label_es').eq('is_active', true).order('sort_order'),
  ])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <div className="flex-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
          <Link href="/inventory/import" className="text-sm text-slate-500 hover:text-slate-700 border border-gray-200 px-3 py-1.5 rounded-lg">
            Importar CSV
          </Link>
        </div>
      </div>

      <form action={createItem} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">General</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.name')} *</label>
            <input
              name="name"
              required
              placeholder="Filtro de aceite Honda"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                name="sku"
                placeholder="ej. FILT-ACE-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.internalCode')} <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                name="internal_code"
                placeholder="REP-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
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
              {units && units.length > 0 ? (
                <select
                  name="unit_combo"
                  defaultValue={`${units[0].id}|${units[0].key}`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                >
                  {units.map(u => (
                    <option key={u.id} value={`${u.id}|${u.key}`}>{u.label_es}</option>
                  ))}
                </select>
              ) : (
                <input
                  name="unit_text"
                  defaultValue="und"
                  placeholder="und, lt, kg..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('new.barcode')} <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              name="barcode"
              placeholder="7891234567890"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
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
          <p className="text-xs text-gray-400">El stock inicial se registra como una entrada al almacén principal.</p>
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
