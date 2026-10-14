'use client'

import { useState } from 'react'

const LOCALE = 'es-CO'

export function FormattedNumber({ value, prefix, suffix }: { value: number; prefix?: string; suffix?: string }) {
  const formatted = value.toLocaleString(LOCALE, { maximumFractionDigits: 0 })
  return <>{prefix}{formatted}{suffix}</>
}

interface NumericInputProps {
  name: string
  defaultValue?: number
  min?: number
  max?: number
  required?: boolean
  className?: string
  placeholder?: string
  decimals?: number
}

export function NumericInput({ name, defaultValue, min, max, required, className, placeholder, decimals = 0 }: NumericInputProps) {
  const isDecimal = decimals > 0

  const format = (n: number) =>
    isDecimal
      ? n.toFixed(decimals)
      : n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })

  const [raw, setRaw] = useState(defaultValue != null ? String(defaultValue) : '')
  const [display, setDisplay] = useState(defaultValue != null ? format(defaultValue) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value

    if (isDecimal) {
      // Allow digits, one dot, and up to `decimals` decimal places
      const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
      const parts = clean.split('.')
      const truncated = parts.length > 1
        ? `${parts[0]}.${parts[1].slice(0, decimals)}`
        : clean
      setRaw(truncated)
      setDisplay(truncated)
      return
    }

    const digits = val.replace(/\D/g, '')
    if (digits === '') { setRaw(''); setDisplay(''); return }
    const num = parseInt(digits, 10)
    if (isNaN(num)) return
    if (max != null && num > max) return
    setRaw(String(num))
    setDisplay(format(num))
  }

  function handleBlur() {
    if (raw === '') return
    const num = isDecimal ? parseFloat(raw) : parseInt(raw, 10)
    if (isNaN(num)) return
    if (min != null && num < min) {
      const clamped = min
      setRaw(String(clamped))
      setDisplay(format(clamped))
      return
    }
    if (isDecimal) setDisplay(format(num))
  }

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <input
        type="text"
        inputMode={isDecimal ? 'decimal' : 'numeric'}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        placeholder={placeholder}
        className={className}
      />
    </>
  )
}
