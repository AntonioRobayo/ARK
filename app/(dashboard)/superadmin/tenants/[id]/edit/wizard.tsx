'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateTenant } from '../actions'
import { calculateMonthly, formatUSD } from '@/lib/billing'

type Plan = {
  id: string
  name: string
  description?: string | null
  min_users?: number | null
  max_users?: number | null
  price_monthly: number
  price_per_user?: number | null
  min_monthly?: number | null
  price_per_extra_branch?: number | null
  currency: string
}

type Country = {
  code: string
  name: string
  currency: string
  timezone: string
}

type TenantData = {
  id: string
  name: string
  country_code: string | null
  currency_code: string | null
  timezone: string | null
  plan_id: string | null
  plan_expires_at: string | null
  contracted_users?: number | null
  contracted_branches?: number | null
}

type Currency = { code: string; name: string }

export function EditTenantWizard({
  tenant,
  plans,
  countries,
  currencies,
}: {
  tenant: TenantData
  plans: Plan[]
  countries: Country[]
  currencies: Currency[]
}) {
  const t = useTranslations('superadmin.workshops.edit.wizard')
  const tw = useTranslations('superadmin.workshops.new.wizard')
  const tl = useTranslations('licenses')
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  // Step 1
  const [name, setName] = useState(tenant.name)
  const [countryCode, setCountryCode] = useState(tenant.country_code ?? countries[0]?.code ?? 'CO')
  const [currencyCode, setCurrencyCode] = useState(tenant.currency_code ?? 'COP')
  const [timezone, setTimezone] = useState(tenant.timezone ?? 'America/Bogota')

  // Step 2
  const [planId, setPlanId] = useState(tenant.plan_id ?? '')
  const [expiresAt, setExpiresAt] = useState(
    tenant.plan_expires_at
      ? new Date(tenant.plan_expires_at).toISOString().slice(0, 10)
      : ''
  )
  const [contractedUsers, setContractedUsers] = useState(tenant.contracted_users ?? 1)
  const [contractedBranches, setContractedBranches] = useState(tenant.contracted_branches ?? 1)

  const STEPS = [
    { n: 1, label: t('steps.workshop') },
    { n: 2, label: t('steps.license') },
    { n: 3, label: t('steps.confirm') },
  ]

  function handleCountryChange(code: string) {
    setCountryCode(code)
    const c = countries.find(x => x.code === code)
    if (c) {
      setCurrencyCode(c.currency)
      setTimezone(c.timezone)
    }
  }

  function handlePlanChange(id: string) {
    setPlanId(id)
    const p = plans.find(x => x.id === id)
    if (p) setContractedUsers(p.min_users ?? 1)
  }

  function next() {
    if (step === 1 && !name.trim()) { setError(t('errNameRequired')); return }
    if (step === 2 && !planId)      { setError(t('errPlanRequired')); return }
    setError('')
    setStep(s => Math.min(s + 1, 3) as 1 | 2 | 3)
  }

  function back() { setError(''); setStep(s => Math.max(s - 1, 1) as 1 | 2 | 3) }

  async function handleSubmit() {
    setError('')
    const fd = new FormData()
    fd.set('name', name)
    fd.set('country_code', countryCode)
    fd.set('currency_code', currencyCode)
    fd.set('timezone', timezone)
    fd.set('plan_id', planId)
    fd.set('plan_expires_at', expiresAt)
    fd.set('contracted_users', String(contractedUsers))
    fd.set('contracted_branches', String(contractedBranches))

    startTransition(async () => {
      try {
        await updateTenant(tenant.id, fd)
      } catch (e: unknown) {
        if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
          setError(e.message)
        }
      }
    })
  }

  const selectedPlan = plans.find(p => p.id === planId)
  const selectedCountry = countries.find(c => c.code === countryCode)

  const billing = selectedPlan?.price_per_user
    ? calculateMonthly(selectedPlan, contractedUsers, contractedBranches)
    : null

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (s.n < step) { setError(''); setStep(s.n as 1 | 2 | 3) } }}
                disabled={s.n >= step}
                className="flex flex-col items-center gap-1 disabled:cursor-default">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${step === s.n ? 'bg-orange-500 text-white shadow-md shadow-orange-200' :
                    step > s.n ? 'bg-orange-100 text-orange-600 cursor-pointer hover:bg-orange-200' :
                    'bg-gray-100 text-gray-400'}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-orange-600' : step > s.n ? 'text-orange-400' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-8px] sm:mt-[-20px] transition-colors ${step > s.n ? 'bg-orange-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* Step 1 — Datos */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step1Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step1Desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step1Name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step1Country')}</label>
              <select value={countryCode} onChange={e => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white">
                {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step1Currency')}</label>
              <select value={currencyCode} onChange={e => setCurrencyCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white">
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 2 — Licencia */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step2Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step2Desc')}</p>
            </div>
            <div className="space-y-2">
              {plans.map(plan => (
                <label key={plan.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                    ${planId === plan.id ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-orange-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="plan_id" value={plan.id}
                      checked={planId === plan.id} onChange={() => handlePlanChange(plan.id)}
                      className="accent-orange-500 w-4 h-4" />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{plan.name}</p>
                      {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                      {plan.min_users && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {plan.min_users}–{plan.max_users === 999 ? '∞' : plan.max_users} {tw('step2Users')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    {plan.price_per_user ? (
                      <span className="text-sm font-bold text-gray-700">
                        {formatUSD(plan.price_per_user)}/{tw('step2Users').toLowerCase()}
                      </span>
                    ) : Number(plan.price_monthly) > 0 ? (
                      <span className="text-sm font-bold text-gray-700">
                        {formatUSD(Number(plan.price_monthly))} {tl('perMonth')}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-normal text-xs">{t('noPrice')}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Dynamic pricing calculator */}
            {selectedPlan?.price_per_user && (
              <div className="border border-orange-200 rounded-xl p-4 bg-orange-50 space-y-4">
                <p className="text-sm font-semibold text-orange-800">{tw('step2ContractTitle')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {tw('step2Users')}
                      <span className="ml-1 text-gray-400">({tw('step2UsersHint')} {selectedPlan.min_users ?? 1})</span>
                    </label>
                    <input
                      type="number"
                      min={selectedPlan.min_users ?? 1}
                      max={selectedPlan.max_users === 999 ? undefined : selectedPlan.max_users ?? undefined}
                      value={contractedUsers}
                      onChange={e => setContractedUsers(Math.max(selectedPlan.min_users ?? 1, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  {selectedPlan.price_per_extra_branch && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {tw('step2Branches')}
                        <span className="ml-1 text-gray-400">({tw('step2BranchesHint')} 1)</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={contractedBranches}
                        onChange={e => setContractedBranches(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  )}
                </div>
                {billing && (
                  <div className="border-t border-orange-200 pt-3 space-y-1.5">
                    <CalcRow label={`${tw('calcLicenses')} (${contractedUsers} × ${formatUSD(selectedPlan.price_per_user)})`} value={formatUSD(billing.rawLicense)} />
                    {billing.branchTotal > 0 && (
                      <CalcRow label={`${tw('calcExtraBranches')} (${contractedBranches - 1} × ${formatUSD(selectedPlan.price_per_extra_branch!)})`} value={formatUSD(billing.branchTotal)} />
                    )}
                    {billing.minApplied && selectedPlan.min_monthly && (
                      <CalcRow label={tw('calcMinApplied')} value={formatUSD(selectedPlan.min_monthly)} highlight />
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-orange-300">
                      <span className="text-sm font-bold text-orange-900">{tw('calcTotal')}</span>
                      <span className="text-base font-bold text-orange-600">{formatUSD(billing.total)}/{tw('calcMonth')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('step2ExpiryLabel')}
                <span className="ml-1.5 font-normal text-gray-400 text-xs">{t('step2ExpiryHint')}</span>
              </label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
          </div>
        )}

        {/* Step 3 — Confirmar */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step3Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step3Desc')}</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('reviewSectionWorkshop')}</p>
                <Row label={t('reviewName')} value={name} />
                <Row label={t('reviewCountry')} value={`${selectedCountry?.name ?? countryCode} · ${currencyCode}`} />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('reviewSectionLicense')}</p>
                <Row label={t('reviewPlan')} value={selectedPlan?.name ?? '—'} highlight />
                {selectedPlan && billing ? (
                  <Row label={t('reviewPrice')} value={`${formatUSD(billing.total)} ${tl('perMonth')}`} />
                ) : selectedPlan && Number(selectedPlan.price_monthly) > 0 ? (
                  <Row label={t('reviewPrice')} value={`${formatUSD(Number(selectedPlan.price_monthly))} ${tl('perMonth')}`} />
                ) : null}
                <Row label={t('reviewExpiry')} value={
                  expiresAt
                    ? new Date(expiresAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                    : t('noExpiry')
                } />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {step > 1 && (
            <button onClick={back} disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {t('back')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{t('stepOf', { current: step, total: 3 })}</span>
          {step < 3 ? (
            <button onClick={next}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#FF7316' }}>
              {t('next')}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isPending}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              style={{ backgroundColor: '#FF7316' }}>
              {isPending && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {isPending ? t('submitting') : t('submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${highlight ? 'font-semibold text-orange-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

function CalcRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${highlight ? 'text-orange-700 font-medium' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-orange-700' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
