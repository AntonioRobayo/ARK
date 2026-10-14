'use client'

import { useActionState } from 'react'
import { sendMagicLink } from './actions'

const initialState = { sent: false, error: null as string | null }

export default function PortalAuthPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState)

  if (state.sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4"
          style={{ backgroundColor: '#FF7316' }}
        >
          ✓
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          Te enviamos un enlace de acceso. Haz clic en él para ingresar al portal.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
            style={{ backgroundColor: '#FF7316' }}
          >
            A
          </div>
          <h1 className="text-xl font-bold text-gray-900">Portal del Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresa tu correo para acceder</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ['--tw-ring-color' as string]: '#FF7316' }}
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#FF7316' }}
          >
            {pending ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      </div>
    </div>
  )
}
