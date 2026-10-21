'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
}

const ROLE_LABELS: Record<string, string> = {
  owner:         '👑 Dueño',
  shop_manager:  '🔧 Gerente',
  mechanic:      '🔩 Mecánico',
  receptionist:  '📋 Recepcionista',
  parts_manager: '📦 Líder Repuestos',
  accountant:    '📊 Contador',
}

interface Props {
  members: Member[]
  emailMap: Record<string, string>
  selectedUserId: string | null
}

export function UserPicker({ members, emailMap, selectedUserId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedMember = selectedUserId ? members.find(m => m.id === selectedUserId) : null
  const selectedLabel = selectedMember
    ? [selectedMember.first_name, selectedMember.last_name].filter(Boolean).join(' ') || emailMap[selectedMember.id] || '?'
    : null

  const filtered = members.filter(m => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(' ').toLowerCase()
    const email = (emailMap[m.id] ?? '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function select(id: string | null) {
    setOpen(false)
    if (id) router.push(`/settings/roles?user=${id}`)
    else router.push('/settings/roles')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors w-64 ${
          open
            ? 'border-orange-300 bg-orange-50 text-orange-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="flex-1 text-left truncate">
          {selectedLabel ?? 'Selecciona un usuario...'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {selectedUserId && (
              <li>
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  ✕ Quitar selección
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-gray-400">Sin resultados</li>
            )}
            {filtered.map(m => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || emailMap[m.id] || '?'
              const email = emailMap[m.id] ?? ''
              const isSelected = m.id === selectedUserId
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => select(m.id)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                      isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: m.role === 'owner' ? '#FF7316' : '#6B7280' }}
                    >
                      {(m.first_name?.[0] ?? email[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>{name}</p>
                      <p className="text-xs text-gray-400 truncate">{ROLE_LABELS[m.role ?? ''] ?? m.role ?? 'Sin rol'}</p>
                    </div>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto flex-shrink-0 text-orange-500">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
