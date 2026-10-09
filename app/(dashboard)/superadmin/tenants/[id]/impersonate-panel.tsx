'use client'

import { useState, useTransition } from 'react'
import { generateImpersonateLink } from './actions'

type User = { id: string; email: string; name: string }

export function ImpersonatePanel({ tenantId, tenantName, users }: {
  tenantId: string
  tenantName: string
  users: User[]
}) {
  const [selected, setSelected] = useState(users[0]?.email ?? '')
  const [link, setLink] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    if (!selected) return
    setLink(null)
    setLinkError(null)
    startTransition(async () => {
      const result = await generateImpersonateLink(selected)
      if (result.error) setLinkError(result.error)
      else setLink(result.url ?? null)
    })
  }

  const handleCopy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (users.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-sm text-gray-400 text-center">Este taller no tiene ningún administrador registrado.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">⚠️ Acceso de soporte</p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Genera un enlace de acceso temporal para ver <strong>{tenantName}</strong> como su administrador.
          Ábrelo en una <strong>ventana privada</strong> para no afectar tu sesión actual de superadmin.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
            Usuario a impersonar
          </label>
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setLink(null) }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {users.map(u => (
              <option key={u.id} value={u.email}>
                {u.name} — {u.email}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isPending || !selected}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#FF7316' }}
        >
          {isPending ? 'Generando...' : 'Generar enlace de acceso'}
        </button>

        {linkError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{linkError}</p>
        )}

        {link && (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Enlace generado para {selected}:</p>
              <p className="text-xs text-gray-700 font-mono break-all leading-relaxed">{link}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied ? '✓ Copiado' : 'Copiar enlace'}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-sm font-medium rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors text-center"
              >
                Abrir en nueva pestaña
              </a>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Este enlace es de un solo uso y expira en 24 horas.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
