'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTenantAndInvite } from './actions'

type Plan = {
  id: string
  name: string
  max_branches: number
  max_users: number
  price_monthly: number
  currency: string
  description?: string | null
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

const COUNTRIES = [
  { code: 'CO', label: 'Colombia', currency: 'COP', tz: 'America/Bogota' },
  { code: 'MX', label: 'México', currency: 'MXN', tz: 'America/Mexico_City' },
  { code: 'PE', label: 'Perú', currency: 'PEN', tz: 'America/Lima' },
  { code: 'CL', label: 'Chile', currency: 'CLP', tz: 'America/Santiago' },
  { code: 'AR', label: 'Argentina', currency: 'ARS', tz: 'America/Argentina/Buenos_Aires' },
  { code: 'BR', label: 'Brasil', currency: 'BRL', tz: 'America/Sao_Paulo' },
  { code: 'EC', label: 'Ecuador', currency: 'USD', tz: 'America/Guayaquil' },
  { code: 'PA', label: 'Panamá', currency: 'USD', tz: 'America/Panama' },
  { code: 'ES', label: 'España', currency: 'EUR', tz: 'Europe/Madrid' },
  { code: 'US', label: 'Estados Unidos', currency: 'USD', tz: 'America/New_York' },
  { code: 'OTHER', label: 'Otro', currency: 'USD', tz: 'UTC' },
]

const TIMEZONES = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Guayaquil',
  'America/Panama',
  'America/New_York',
  'Europe/Madrid',
  'UTC',
]

const STEPS = [
  { n: 1, label: 'Taller' },
  { n: 2, label: 'Plan' },
  { n: 3, label: 'Admin' },
  { n: 4, label: 'Confirmar' },
]

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function NewTenantWizard({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<WizardDraft | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [workshopName, setWorkshopName] = useState('')
  const [countryCode, setCountryCode] = useState('CO')
  const [currencyCode, setCurrencyCode] = useState('COP')
  const [timezone, setTimezone] = useState('America/Bogota')

  // Step 2
  const [planId, setPlanId] = useState('')

  // Step 3
  const [adminEmail, setAdminEmail] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d: WizardDraft = JSON.parse(raw)
        setDraft(d)
        setShowDraftBanner(true)
      }
    } catch {
      // ignore
    }
  }, [])

  // Auto-save draft on field changes
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
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    } catch {
      // ignore
    }
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
    const c = COUNTRIES.find(x => x.code === code)
    if (c) {
      setCurrencyCode(c.currency)
      setTimezone(c.tz)
    }
  }

  function next() {
    if (step === 1 && !workshopName.trim()) {
      setError('El nombre del taller es obligatorio.')
      return
    }
    if (step === 2 && !planId) {
      setError('Selecciona un plan.')
      return
    }
    if (step === 3 && !adminEmail.trim()) {
      setError('El email del administrador es obligatorio.')
      return
    }
    setError('')
    setStep(s => Math.min(s + 1, 4) as 1 | 2 | 3 | 4)
  }

  function back() {
    setError('')
    setStep(s => Math.max(s - 1, 1) as 1 | 2 | 3 | 4)
  }

  async function handleSubmit() {
    setError('')
    const fd = new FormData()
    fd.set('workshop_name', workshopName)
    fd.set('country_code', countryCode)
    fd.set('currency_code', currencyCode)
    fd.set('timezone', timezone)
    fd.set('plan_id', planId)
    fd.set('admin_email', adminEmail)
    fd.set('admin_first_name', adminFirstName)

    startTransition(async () => {
      try {
        await createTenantAndInvite(fd)
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
      } catch (e: unknown) {
        // createTenantAndInvite uses redirect(), which throws NEXT_REDIRECT
        // If it's not a redirect, it's a real error
        if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
          setError(e.message)
        }
        // redirect throws are swallowed by Next.js — the router handles navigation
      }
    })
  }

  const selectedPlan = plans.find(p => p.id === planId)

  const draftDate = draft
    ? new Date(draft.savedAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="max-w-2xl">
      {/* Draft banner */}
      {showDraftBanner && draft && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Tienes un borrador guardado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Guardado el {draftDate} — {draft.workshop_name || 'sin nombre'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={resumeDraft}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              Continuar borrador
            </button>
            <button onClick={discardDraft}
              className="text-xs font-medium px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
              Descartar
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
                className="flex flex-col items-center gap-1 group disabled:cursor-default">
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

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* Step 1 — Datos del taller */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Datos del taller</h3>
              <p className="text-sm text-gray-500 mt-0.5">Información básica del taller</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del taller *</label>
              <input
                type="text"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                placeholder="Taller Moto Express"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              {workshopName && (
                <p className="mt-1 text-xs text-gray-400">
                  URL: <span className="font-mono text-gray-600">{toSlug(workshopName)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
              <select
                value={countryCode}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona horaria</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Plan */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Plan de licencia</h3>
              <p className="text-sm text-gray-500 mt-0.5">Selecciona el plan que tendrá este taller</p>
            </div>
            {plans.length === 0 ? (
              <p className="text-sm text-red-500">No hay planes activos. <a href="/superadmin/licenses/new" className="underline">Crea un plan primero.</a></p>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <label key={plan.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                      ${planId === plan.id ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-orange-200'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan_id"
                        value={plan.id}
                        checked={planId === plan.id}
                        onChange={() => setPlanId(plan.id)}
                        className="accent-orange-500 w-4 h-4"
                      />
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{plan.name}</p>
                        {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {plan.max_branches === 999 ? 'Sucursales ilimitadas' : `${plan.max_branches} sucursal${plan.max_branches !== 1 ? 'es' : ''}`}
                          {' · '}
                          {plan.max_users === 999 ? 'Usuarios ilimitados' : `${plan.max_users} usuario${plan.max_users !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 ml-4 shrink-0">
                      {Number(plan.price_monthly) > 0
                        ? `$${Number(plan.price_monthly).toLocaleString('es-CO')} ${plan.currency}/mes`
                        : <span className="text-gray-400 font-normal text-xs">Sin precio</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Admin */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Administrador del taller</h3>
              <p className="text-sm text-gray-500 mt-0.5">Se enviará una invitación a este correo</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email del administrador *</label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@tallermotoexpress.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Recibirá un enlace para configurar su contraseña y completar el registro.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={adminFirstName}
                onChange={e => setAdminFirstName(e.target.value)}
                placeholder="Carlos"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Se pre-rellena en el formulario de bienvenida del administrador.
              </p>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Confirmar creación</h3>
              <p className="text-sm text-gray-500 mt-0.5">Revisa los datos antes de crear el taller</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Taller</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nombre</span>
                  <span className="text-sm font-semibold text-gray-900">{workshopName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">País / Moneda</span>
                  <span className="text-sm text-gray-900">
                    {COUNTRIES.find(c => c.code === countryCode)?.label ?? countryCode} · {currencyCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Zona horaria</span>
                  <span className="text-sm text-gray-900">{timezone}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan seleccionado</span>
                  <span className="text-sm font-semibold text-orange-600">{selectedPlan?.name ?? '—'}</span>
                </div>
                {selectedPlan && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precio</span>
                    <span className="text-sm text-gray-900">
                      {Number(selectedPlan.price_monthly) > 0
                        ? `$${Number(selectedPlan.price_monthly).toLocaleString('es-CO')} ${selectedPlan.currency}/mes`
                        : 'Sin precio'}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Administrador</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-semibold text-gray-900">{adminEmail}</span>
                </div>
                {adminFirstName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nombre</span>
                    <span className="text-sm text-gray-900">{adminFirstName}</span>
                  </div>
                )}
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
              ← Anterior
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Paso {step} de 4</span>
          {step < 4 ? (
            <button onClick={next}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#FF7316' }}>
              Siguiente →
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
              {isPending ? 'Creando...' : 'Crear taller y enviar invitación'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
