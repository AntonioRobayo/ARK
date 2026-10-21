import Link from 'next/link'
import { createCustomer } from './actions'
import { getTranslations } from 'next-intl/server'
import { getCatalog } from '@/lib/catalog'
import { CatalogCombobox } from '@/components/CatalogCombobox'

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  const { error, redirect: redirectTo } = await searchParams
  const t = await getTranslations('customers')
  const docTypes = await getCatalog('document_type')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600 text-sm">{t('new.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('new.title')}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createCustomer} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
        <input type="hidden" name="redirect_to" value={redirectTo ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.firstName')}</label>
            <input name="first_name" type="text" required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder={t('new.firstNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.lastName')}</label>
            <input name="last_name" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder={t('new.lastNamePlaceholder')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.documentType')}</label>
            <CatalogCombobox
              name="id_type"
              options={[{ value: '', label: t('new.selectDocType') }, ...docTypes]}
              defaultValue=""
              placeholder={t('new.selectDocType')}
              allowCustom={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.documentNumber')}</label>
            <input name="id_number" type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="1234567890" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.phone')}</label>
            <input name="phone" type="tel"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="3001234567" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.email')}</label>
            <input name="email" type="email"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="juan@ejemplo.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.address')}</label>
          <input name="address" type="text"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder={t('new.addressPlaceholder')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('new.notes')}</label>
          <textarea name="notes" rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder={t('new.notesPlaceholder')} />
        </div>

        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg text-sm transition-colors">
          {t('new.submit')}
        </button>
      </form>
    </div>
  )
}
