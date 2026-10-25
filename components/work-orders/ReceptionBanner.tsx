'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DriveUploader } from './DriveUploader'

interface Props {
  otId: string
  vehicleId: string
  driveEnabled: boolean
}

const RECEPTION_SECTIONS = [
  { key: 'recepcion',         label: 'Fotos del vehículo' },
  { key: 'repuestos_cliente', label: 'Repuestos traídos' },
  { key: 'custodia',         label: 'Objetos en custodia' },
]

export function ReceptionBanner({ otId, vehicleId, driveEnabled }: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('recepcion')

  const handleDone = () => {
    router.push(`/work-orders/${otId}`)
  }

  return (
    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-orange-200 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-orange-900 text-sm">Completa la recepción</p>
          <p className="text-xs text-orange-700 mt-0.5">
            El correo fue enviado al cliente. Agrega las fotos antes de continuar.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
        >
          Listo →
        </button>
      </div>

      {driveEnabled ? (
        <div className="px-5 py-4">
          {/* Section tabs */}
          <div className="flex gap-1.5 mb-4">
            {RECEPTION_SECTIONS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  activeSection === s.key
                    ? 'bg-orange-500 text-white'
                    : 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <DriveUploader
            workOrderId={otId}
            vehicleId={vehicleId}
            section={activeSection}
          />
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-orange-700">
          Google Drive no está conectado.{' '}
          <a href="/settings/integrations" className="underline">Configurar →</a>
        </div>
      )}
    </div>
  )
}
