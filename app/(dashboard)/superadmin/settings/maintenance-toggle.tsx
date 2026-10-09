'use client'

import { useState } from 'react'

export function MaintenanceToggle({ defaultValue }: { defaultValue: boolean }) {
  const [enabled, setEnabled] = useState(defaultValue)

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="maintenance_mode" value={enabled ? 'true' : 'false'} />
      <button
        type="button"
        onClick={() => setEnabled(v => !v)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 ${
          enabled ? 'bg-red-500' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-sm font-medium ${enabled ? 'text-red-600' : 'text-gray-500'}`}>
        {enabled ? 'Activado — todos los tenants serán bloqueados' : 'Desactivado'}
      </span>
    </div>
  )
}
