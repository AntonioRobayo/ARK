'use client'

import { useState } from 'react'
import { DriveUploader } from './DriveUploader'

interface Attachment {
  id: string
  section: string
  drive_file_id: string
  drive_thumb_url: string | null
  original_name: string
  mime_type: string
  size_kb: number | null
  created_at: string
}

interface Props {
  workOrderId: string
  vehicleId: string
  attachments: Attachment[]
  driveEnabled: boolean
}

const SECTIONS = [
  { key: 'recepcion',          label: 'Recepción' },
  { key: 'custodia',           label: 'Custodia' },
  { key: 'diagnostico',        label: 'Diagnóstico' },
  { key: 'trabajo',            label: 'Trabajo' },
  { key: 'repuestos',          label: 'Repuestos' },
  { key: 'repuestos_cliente',  label: 'Rep. cliente' },
  { key: 'entrega',            label: 'Entrega' },
  { key: 'documentos',         label: 'Documentos' },
]

function DriveFileLink({ fileId, children }: { fileId: string; children: React.ReactNode }) {
  return (
    <a
      href={`https://drive.google.com/file/d/${fileId}/view`}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {children}
    </a>
  )
}

export function OTGallery({ workOrderId, vehicleId, attachments, driveEnabled }: Props) {
  const [activeSection, setActiveSection] = useState('recepcion')

  const sectionCounts = attachments.reduce<Record<string, number>>((acc, a) => {
    acc[a.section] = (acc[a.section] ?? 0) + 1
    return acc
  }, {})

  const current = attachments.filter(a => a.section === activeSection)

  if (!driveEnabled) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        <p className="mb-1">Google Drive no está conectado</p>
        <a href="/settings/integrations" className="text-slate-500 hover:underline text-xs">
          Configurar en Integraciones →
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeSection === s.key
                ? 'bg-slate-700 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {s.label}
            {sectionCounts[s.key] ? (
              <span className={`ml-1 ${activeSection === s.key ? 'text-slate-300' : 'text-gray-300'}`}>
                {sectionCounts[s.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Grid */}
      {current.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {current.map(a => (
            <DriveFileLink key={a.id} fileId={a.drive_file_id}>
              {a.mime_type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.drive_thumb_url ?? `https://drive.google.com/thumbnail?id=${a.drive_file_id}&sz=w200`}
                  alt={a.original_name}
                  className="w-full aspect-square object-cover rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              ) : a.mime_type.startsWith('video/') ? (
                <div className="w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl">▶</div>
                    <p className="text-white text-xs mt-1 truncate max-w-16 mx-auto px-1">{a.original_name}</p>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl">📄</div>
                    <p className="text-gray-600 text-xs mt-1 truncate max-w-16 mx-auto px-1">{a.original_name}</p>
                  </div>
                </div>
              )}
            </DriveFileLink>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4 mb-2">Sin archivos en esta sección</p>
      )}

      {/* Uploader */}
      <DriveUploader
        workOrderId={workOrderId}
        vehicleId={vehicleId}
        section={activeSection}
      />
    </div>
  )
}
