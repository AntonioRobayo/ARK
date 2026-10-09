import Link from 'next/link'
import { NumericInput } from '@/components/numeric-input'
import { createLicensePlan } from '../actions'
import { getTranslations } from 'next-intl/server'

export default async function NewLicensePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('superadmin')
  const cls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent'

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/licenses" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">{t('licenses.new.title')}</h2>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createLicensePlan} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.name')}</label>
            <input name="name" type="text" required placeholder="ej. Professional" className={cls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.description')}</label>
            <input name="description" type="text" placeholder="Para talleres en crecimiento" className={cls} />
          </div>
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('licenses.new.priceSection')}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.minUsers')}</label>
            <NumericInput name="min_users" defaultValue={1} min={1} required className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.maxUsers')} <span className="ml-1 font-normal text-gray-400">{t('licenses.new.maxUsersHint')}</span></label>
            <NumericInput name="max_users" defaultValue={5} min={1} max={999} required className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.pricePerUser')} <span className="font-normal text-gray-400">USD</span></label>
            <NumericInput name="price_per_user" defaultValue={0} min={0} required className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.minMonthly')} <span className="font-normal text-gray-400">USD</span></label>
            <NumericInput name="min_monthly" defaultValue={0} min={0} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.pricePerExtraBranch')} <span className="font-normal text-gray-400">USD</span></label>
            <NumericInput name="price_per_extra_branch" defaultValue={0} min={0} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenses.new.sortOrder')}</label>
            <NumericInput name="sort_order" defaultValue={10} min={1} className={cls} />
          </div>
        </div>

        <button type="submit"
          className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}>
          {t('licenses.new.submit')}
        </button>
      </form>
    </div>
  )
}
