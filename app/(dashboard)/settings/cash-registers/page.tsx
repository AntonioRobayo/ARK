import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { upsertCashRegister, toggleCashRegister } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function CashRegistersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { new: isNew, edit: editId } = await searchParams
  const supabase = await createClient()

  const { data: registers } = await supabase
    .from('cash_register')
    .select('id, name, is_active, branch:branch_id(name)')
    .order('name', { ascending: true })

  const editRegister = editId ? (registers ?? []).find((r: any) => r.id === editId) : null
  const showForm = isNew === '1' || editId
  const t = await getTranslations('settings')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">{t('cashRegisters.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('cashRegisters.title')}</h1>
        {!showForm && (
          <Link href="/settings/cash-registers?new=1"
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {t('cashRegisters.new')}
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-700 mb-4">{editId ? t('cashRegisters.editTitle') : t('cashRegisters.newTitle')}</p>
          <form action={upsertCashRegister} className="space-y-4">
            {editId && <input type="hidden" name="id" value={editId} />}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('cashRegisters.name')}</label>
              <input name="name" required defaultValue={editRegister?.name ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder={t('cashRegisters.namePlaceholder')} />
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {editId ? t('cashRegisters.save') : t('cashRegisters.create')}
              </button>
              <Link href="/settings/cash-registers"
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors">
                {t('cashRegisters.cancel')}
              </Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!registers || registers.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">{t('cashRegisters.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('cashRegisters.table.name')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('cashRegisters.table.branch')}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{t('cashRegisters.table.status')}</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {registers.map((r: any) => (
                <tr key={r.id} className={`border-b border-gray-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{(r.branch as any)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <form action={toggleCashRegister}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="is_active" value={String(r.is_active)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {r.is_active ? t('cashRegisters.active') : t('cashRegisters.inactive')}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/settings/cash-registers?edit=${r.id}`} className="text-xs text-slate-500 hover:underline">{t('cashRegisters.edit')}</Link>
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
