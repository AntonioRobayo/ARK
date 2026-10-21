import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { BranchesClient } from './BranchesClient'

const SUCCESS_KEYS: Record<string, string> = {
  created: 'successCreated',
  updated: 'successUpdated',
  main:    'successMain',
  toggle:  'successToggle',
}

const ERROR_KEYS: Record<string, string> = {
  noPermission:          'noPermission',
  cannotDeactivateMain:  'cannotDeactivateMain',
}

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!myProfile?.tenant_id) redirect('/settings')

  const admin = createAdminClient()

  const [{ data: branches }, { data: tenant }] = await Promise.all([
    admin.from('branch')
      .select('id, name, address, city, phone, email, is_main, is_active')
      .eq('tenant_id', myProfile.tenant_id)
      .is('deleted_at', null)
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true }),
    admin.from('tenants')
      .select('contracted_branches')
      .eq('id', myProfile.tenant_id)
      .single(),
  ])

  const t = await getTranslations('settings.branches')

  const canManage = myProfile.role === 'owner' || myProfile.role === 'shop_manager'
  const contractedBranches = tenant?.contracted_branches ?? 1
  const currentBranchCount = branches?.length ?? 0
  const atLimit = currentBranchCount >= contractedBranches

  const errorKey = error ? ERROR_KEYS[error] : null
  const errorMsg = errorKey ? t(errorKey as Parameters<typeof t>[0]) : error ? decodeURIComponent(error) : null
  const successKey = success ? SUCCESS_KEYS[success] : null
  const successMsg = successKey ? t(successKey as Parameters<typeof t>[0]) : null

  const labels = {
    addBtn:             t('addBtn'),
    cancelBtn:          t('cancelBtn'),
    saveBtn:            t('saveBtn'),
    newTitle:           t('newTitle'),
    editTitle:          t('editTitle'),
    nameLabel:          t('nameLabel'),
    namePlaceholder:    t('namePlaceholder'),
    addressLabel:       t('addressLabel'),
    addressPlaceholder: t('addressPlaceholder'),
    cityLabel:          t('cityLabel'),
    cityPlaceholder:    t('cityPlaceholder'),
    phoneLabel:         t('phoneLabel'),
    phonePlaceholder:   t('phonePlaceholder'),
    emailLabel:         t('emailLabel'),
    emailPlaceholder:   t('emailPlaceholder'),
    mainBadge:          t('mainBadge'),
    activeBadge:        t('activeBadge'),
    inactiveBadge:      t('inactiveBadge'),
    setMain:            t('setMain'),
    deactivate:         t('deactivate'),
    reactivate:         t('reactivate'),
    edit:               t('edit'),
    empty:              t('empty'),
    tableHeaders: {
      name:   t('table.name'),
      city:   t('table.city'),
      phone:  t('table.phone'),
      status: t('table.status'),
    },
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400">{t('subtitle')}</p>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* No permission notice */}
      {!canManage && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {t('noPermission')}
        </div>
      )}

      {/* License limit notice */}
      {canManage && atLimit && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-semibold">Límite de sucursales alcanzado ({currentBranchCount}/{contractedBranches})</p>
          <p className="mt-0.5 text-amber-700">Tu plan actual incluye {contractedBranches} sucursal{contractedBranches !== 1 ? 'es' : ''}. Para agregar más, actualiza tu plan en la sección de facturación o contacta a soporte.</p>
        </div>
      )}

      {canManage && !atLimit && (
        <div className="mb-2 text-xs text-gray-400 text-right">
          {currentBranchCount} / {contractedBranches} sucursal{contractedBranches !== 1 ? 'es' : ''} usada{currentBranchCount !== 1 ? 's' : ''}
        </div>
      )}

      <BranchesClient
        branches={branches ?? []}
        canManage={canManage && !atLimit}
        labels={labels}
      />
    </div>
  )
}
