'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const SECTION_KEYS = ['procedimientos', 'formatos', 'capacitacion', 'seguridad', 'garantias', 'contratos'] as const
type SectionKey = typeof SECTION_KEYS[number]

interface ManualFile {
  id: string
  sectionKey: string
  drive_file_id: string
  drive_thumb_url: string | null
  original_name: string
  mime_type: string
  size_kb: number | null
  created_at: string
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📊'
  return '📎'
}

export function ManualsClient({ attachments }: { attachments: ManualFile[] }) {
  const t = useTranslations('settings.manuals')
  const [activeSection, setActiveSection] = useState<SectionKey>('procedimientos')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const sectionFiles = attachments.filter(a => a.sectionKey === activeSection)
  const sectionCounts = attachments.reduce<Record<string, number>>((acc, a) => {
    acc[a.sectionKey] = (acc[a.sectionKey] ?? 0) + 1
    return acc
  }, {})

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadError(null)

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('section', activeSection)
      const res = await fetch('/api/drive/upload-manual', { method: 'POST', body: fd })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setUploadError(
          json.error === 'drive_quota_exceeded'
            ? t('uploadErrorQuota')
            : t('uploadErrorGeneric', { name: file.name })
        )
      }
    }

    setUploading(false)
    e.target.value = ''
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="border-b border-gray-100 px-5 pt-4">
          <div className="flex gap-1 overflow-x-auto pb-3">
            {SECTION_KEYS.map(key => (
              <button
                key={key}
                onClick={() => { setActiveSection(key); setUploadError(null) }}
                className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-slate-700 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t(`sections.${key}`)}
                {sectionCounts[key] ? (
                  <span className={`ml-1.5 text-xs ${activeSection === key ? 'text-slate-300' : 'text-gray-300'}`}>
                    {sectionCounts[key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs text-gray-400 mb-4">{t(`sectionDescs.${activeSection}`)}</p>

          {sectionFiles.length > 0 ? (
            <div className="space-y-1.5 mb-4">
              {sectionFiles.map(f => (
                <a
                  key={f.id}
                  href={`https://drive.google.com/file/d/${f.drive_file_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <span className="text-xl flex-shrink-0">{fileIcon(f.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.original_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.size_kb ? `${f.size_kb} KB · ` : ''}
                      {new Date(f.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 flex-shrink-0">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 py-4 text-center mb-4">{t('empty')}</p>
          )}

          {uploadError && (
            <p className="text-xs text-red-500 mb-3">{uploadError}</p>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 w-full justify-center"
          >
            {uploading ? (
              <><span className="animate-spin">⏳</span> {t('uploading')}</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {t('uploadBtn', { section: t(`sections.${activeSection}`) })}
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>
    </div>
  )
}
