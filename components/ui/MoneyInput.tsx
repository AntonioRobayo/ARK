'use client'

import { useState, useRef } from 'react'

interface MoneyInputProps {
  name: string
  defaultValue?: number | string
  className?: string
  required?: boolean
  min?: number
  step?: number
  placeholder?: string
}

function format(val: number): string {
  return val.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

function parse(str: string): number {
  // Remove thousands separators (.) and replace decimal comma with dot
  const clean = str.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

export function MoneyInput({
  name,
  defaultValue = 0,
  className = '',
  required,
  min = 0,
  step = 1,
  placeholder = '0',
}: MoneyInputProps) {
  const raw = typeof defaultValue === 'string' ? parseFloat(defaultValue) || 0 : defaultValue
  const [display, setDisplay] = useState(raw > 0 ? format(raw) : '')
  const [hidden, setHidden] = useState(String(raw))
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFocus() {
    // Show raw number while editing for easy selection
    const n = parse(display)
    setDisplay(n > 0 ? String(n) : '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    // Allow only digits, commas and dots while typing
    if (/^[\d.,]*$/.test(val)) {
      setDisplay(val)
      setHidden(String(parse(val)))
    }
  }

  function handleBlur() {
    const n = parse(display)
    setDisplay(n > 0 ? format(n) : '')
    setHidden(String(n))
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        required={required}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      />
      <input type="hidden" name={name} value={hidden} />
    </>
  )
}
