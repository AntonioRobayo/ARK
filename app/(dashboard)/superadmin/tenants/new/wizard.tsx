'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createTenantAndInvite } from './actions'
import { calculateMonthly, formatUSD } from '@/lib/billing'

type Plan = {
  id: string
  name: string
  min_users: number | null
  max_users: number
  price_monthly: number
  price_per_user: number | null
  min_monthly: number | null
  price_per_extra_branch: number | null
  currency: string
  description?: string | null
}

type Country = {
  code: string
  name: string
  currency: string
  timezone: string
}

type WizardDraft = {
  savedAt: string
  step: number
  workshop_name: string
  country_code: string
  currency_code: string
  timezone: string
  plan_id: string
  admin_email: string
  admin_first_name: string
}

const DRAFT_KEY = 'ark_wizard_new_tenant'


function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type Currency = { code: string; name: string }

export function NewTenantWizard({ plans, countries, currencies }: { plans: Plan[]; countries: Country[]; currencies: Currency[] }) {
  const t = useTranslations('superadmin.workshops.new.wizard')
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<WizardDraft | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [error, setError] = useState('')

  const defaultCountry = countries[0]

  // Step 1
  const [workshopName, setWorkshopName] = useState('')
  const [countryCode, setCountryCode] = useState(defaultCountry?.code ?? 'CO')
  const [currencyCode, setCurrencyCode] = useState(defaultCountry?.currency ?? 'COP')
  const [timezone, setTimezone] = useState(defaultCountry?.timezone ?? 'America/Bogota')

  // Step 2
  const [planId, setPlanId] = useState('')
  const [contractedUsers, setContractedUsers] = useState(1)
  const [contractedBranches, setContractedBranches] = useState(1)

  // Step 3
  const [adminEmail, setAdminEmail] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')

  const STEPS = [
    { n: 1, label: t('steps.workshop') },
    { n: 2, label: t('steps.plan') },
    { n: 3, label: t('steps.admin') },
    { n: 4, label: t('steps.confirm') },
  ]

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d: WizardDraft = JSON.parse(raw)
        setDraft(d)
        setShowDraftBanner(true)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!workshopName && !adminEmail && !planId) return
    const d: WizardDraft = {
      savedAt: new Date().toISOString(),
      step,
      workshop_name: workshopName,
      country_code: countryCode,
      currency_code: currencyCode,
      timezone,
      plan_id: planId,
      admin_email: adminEmail,
      admin_first_name: adminFirstName,
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* ignore */ }
  }, [step, workshopName, countryCode, currencyCode, timezone, planId, adminEmail, adminFirstName])

  function resumeDraft() {
    if (!draft) return
    setWorkshopName(draft.workshop_name)
    setCountryCode(draft.country_code)
    setCurrencyCode(draft.currency_code)
    setTimezone(draft.timezone)
    setPlanId(draft.plan_id)
    setAdminEmail(draft.admin_email)
    setAdminFirstName(draft.admin_first_name)
    setStep(draft.step)
    setShowDraftBanner(false)
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setDraft(null)
    setShowDraftBanner(false)
  }

  function handleCountryChange(code: string) {
    setCountryCode(code)
    const c = countries.find(x => x.code === code)
    if (c) {
      setCurrencyCode(c.currency)
      setTimezone(c.timezone)
    }
  }

  function next() {
    if (step === 1 && !workshopName.trim()) { setError(t('errNameRequired')); return }
    if (step === 2 && !planId)              { setError(t('errPlanRequired')); return }
    if (step === 3 && !adminEmail.trim())   { setError(t('errEmailRequired')); return }
    setError('')
    setStep(s => Math.min(s + 1, 4) as 1 | 2 | 3 | 4)
  }

  function back() { setError(''); setStep(s => Math.max(s - 1, 1) as 1 | 2 | 3 | 4) }

  async function handleSubmit() {
    setError('')
    const fd = new FormData()
    fd.set('workshop_name', workshopName)
    fd.set('country_code', countryCode)
    fd.set('currency_code', currencyCode)
    fd.set('timezone', timezone)
    fd.set('plan_id', planId)
    fd.set('contracted_users', String(contractedUsers))
    fd.set('contracted_branches', String(contractedBranches))
    fd.set('admin_email', adminEmail)
    fd.set('admin_first_name', adminFirstName)

    startTransition(async () => {
      try {
        await createTenantAndInvite(fd)
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
      } catch (e: unknown) {
        if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
          setError(e.message)
        }
      }
    })
  }

  const selectedPlan = plans.find(p => p.id === planId)
  const selectedCountry = countries.find(c => c.code === countryCode)

  const draftDate = draft
    ? new Date(draft.savedAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  function planLabel(plan: Plan) {
    const branches = plan.max_branches === 999
      ? t('unlimitedBranches')
      : plan.max_branches !== 1 ? t('branchPlural', { n: plan.max_branches }) : t('branch', { n: plan.max_branches })
    const users = plan.max_users === 999
      ? t('unlimitedUsers')
      : plan.max_users !== 1 ? t('userPlural', { n: plan.max_users }) : t('user', { n: plan.max_users })
    return `${branches} · ${users}`
  }

  return (
    <div className="max-w-2xl">
      {/* Draft banner */}
      {showDraftBanner && draft && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">{t('draftFound')}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {t('draftSavedAt', { date: draftDate, name: draft.workshop_name || t('noName') })}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={resumeDraft}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              {t('draftResume')}
            </button>
            <button onClick={discardDraft}
              className="text-xs font-medium px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
              {t('draftDiscard')}
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (s.n < step) { setError(''); setStep(s.n as 1 | 2 | 3 | 4) } }}
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

        {/* Step 1 — Taller */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step1Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step1Desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step1Name')}</label>
              <input type="text" value={workshopName} onChange={e => setWorkshopName(e.target.value)}
                placeholder={t('step1NamePlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              {workshopName && (
                <p className="mt-1 text-xs text-gray-400">{t('slugPreview', { slug: toSlug(workshopName) })}</p>
              )}
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

        {/* Step 2 — Plan */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step2Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step2Desc')}</p>
            </div>
            {plans.length === 0 ? (
              <p className="text-sm text-red-500">
                {t('step2NoPlans')}{' '}
                <a href="/superadmin/licenses/new" className="underline">{t('step2CreatePlan')}</a>
              </p>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <label key={plan.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                      ${planId === plan.id ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-orange-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan_id" value={plan.id}
                        checked={planId === plan.id}
                        onChange={() => {
                          setPlanId(plan.id)
                          setContractedUsers(plan.min_users ?? 1)
                        }}
                        className="accent-orange-500 w-4 h-4" />
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{plan.name}</p>
                        {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {plan.min_users ?? 1}–{plan.max_users === 999 ? '∞' : plan.max_users} {t('userPlural', { n: plan.max_users })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 ml-4 shrink-0">
                      {plan.price_per_user
                        ? <span>{formatUSD(Number(plan.price_per_user))}<span className="text-xs font-normal text-gray-400">/{t('userShort')}</span></span>
                        : <span className="text-gray-400 font-normal text-xs">{t('noPrice')}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Contracted users / branches + calculator */}
            {selectedPlan?.price_per_user && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('step2ContractTitle')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('step2Users')}</label>
                    <input type="number"
                      min={selectedPlan.min_users ?? 1}
                      max={selectedPlan.max_users === 999 ? undefined : selectedPlan.max_users}
                      value={contractedUsers}
                      onChange={e => setContractedUsers(Math.max(selectedPlan.min_users ?? 1, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <p className="text-xs text-gray-400 mt-1">{t('step2UsersHint', { min: selectedPlan.min_users ?? 1, max: selectedPlan.max_users === 999 ? '∞' : selectedPlan.max_users })}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('step2Branches')}</label>
                    <input type="number" min={1} value={contractedBranches}
                      onChange={e => setContractedBranches(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <p className="text-xs text-gray-400 mt-1">{t('step2BranchesHint')}</p>
                  </div>
                </div>
                {/* Live price breakdown */}
                {(() => {
                  const b = calculateMonthly(selectedPlan, contractedUsers, contractedBranches)
                  return (
                    <div className="border-t border-gray-200 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('calcLicenses', { n: contractedUsers })}</span>
                        <span className="text-gray-700">
                          {formatUSD(b.licenseTotal)}
                          {b.minApplied && <span className="text-xs text-orange-500 ml-1">({t('calcMinApplied')})</span>}
                        </span>
                      </div>
                      {b.extraBranches > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t('calcExtraBranches', { n: b.extraBranches })}</span>
                          <span className="text-gray-700">{formatUSD(b.branchTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5 mt-1">
                        <span className="text-gray-900">{t('calcTotal')}</span>
                        <span style={{ color: '#FF7316' }}>{formatUSD(b.total)} / {t('calcMonth')}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Admin */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step3Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step3Desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step3Email')}</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                placeholder={t('step3EmailPlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              <p className="mt-1.5 text-xs text-gray-400">{t('step3EmailHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('step3FirstName')}</label>
              <input type="text" value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)}
                placeholder={t('step3FirstNamePlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              <p className="mt-1.5 text-xs text-gray-400">{t('step3FirstNameHint')}</p>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('step4Title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('step4Desc')}</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('reviewSectionWorkshop')}</p>
                <Row label={t('reviewName')} value={workshopName} />
                <Row label={t('reviewCountry')} value={`${selectedCountry?.name ?? countryCode} · ${currencyCode}`} />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('reviewSectionPlan')}</p>
                <Row label={t('reviewPlanSelected')} value={selectedPlan?.name ?? '—'} highlight />
                {selectedPlan && (
                  <>
                    <Row label={t('step2Users')} value={`${contractedUsers}`} />
                    <Row label={t('step2Branches')} value={`${contractedBranches}`} />
                    {selectedPlan.price_per_user ? (() => {
                      const b = calculateMonthly(selectedPlan, contractedUsers, contractedBranches)
                      return <Row label={t('reviewPrice')} value={`${formatUSD(b.total)} / ${t('calcMonth')}`} highlight />
                    })() : (
                      <Row label={t('reviewPrice')} value={t('noPrice')} />
                    )}
                  </>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('reviewSectionAdmin')}</p>
                <Row label={t('reviewEmail')} value={adminEmail} />
                {adminFirstName && <Row label={t('reviewFirstName')} value={adminFirstName} />}
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
          <span className="text-xs text-gray-400">{t('stepOf', { current: step, total: 4 })}</span>
          {step < 4 ? (
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
