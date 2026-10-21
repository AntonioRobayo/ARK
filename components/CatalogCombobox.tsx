'use client'

import { useState, useRef, useEffect } from 'react'

interface Option { value: string; label: string }

interface Props {
  name: string
  options: Option[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
  className?: string
  allowCustom?: boolean
}

export function CatalogCombobox({
  name,
  options,
  defaultValue = '',
  placeholder = '',
  required,
  className,
  allowCustom = true,
}: Props) {
  const defaultLabel = options.find(o => o.value === defaultValue)?.label ?? defaultValue
  const [inputVal, setInputVal] = useState(defaultLabel)
  const [hiddenVal, setHiddenVal] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(inputVal.toLowerCase()) ||
    o.value.toLowerCase().includes(inputVal.toLowerCase())
  )

  function select(opt: Option) {
    setInputVal(opt.label)
    setHiddenVal(opt.value)
    setOpen(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setInputVal(v)
    const match = options.find(o => o.label.toLowerCase() === v.toLowerCase())
    setHiddenVal(match ? match.value : (allowCustom ? v : ''))
    setOpen(true)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const baseClass = className || 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={hiddenVal} />
      <input
        type="text"
        value={inputVal}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={baseClass}
      />
      {open && (filtered.length > 0 || (allowCustom && inputVal)) && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
          {filtered.map(opt => (
            <li
              key={opt.value}
              onMouseDown={() => select(opt)}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                hiddenVal === opt.value ? 'bg-slate-100 font-medium' : ''
              }`}
            >
              {opt.label}
            </li>
          ))}
          {allowCustom && inputVal && !options.find(o => o.label.toLowerCase() === inputVal.toLowerCase()) && (
            <li
              onMouseDown={() => { setHiddenVal(inputVal); setOpen(false) }}
              className="px-3 py-2 cursor-pointer hover:bg-orange-50 text-orange-600 text-xs border-t border-gray-100"
            >
              Usar &ldquo;{inputVal}&rdquo; como valor nuevo
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
