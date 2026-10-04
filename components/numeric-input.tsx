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
}

export function NumericInput({ name, defaultValue, min, max, required, className, placeholder }: NumericInputProps) {
  const format = (n: number) => n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })

  const [raw, setRaw] = useState(defaultValue != null ? String(defaultValue) : '')
  const [display, setDisplay] = useState(defaultValue != null ? format(defaultValue) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (digits === '') {
      setRaw('')
      setDisplay('')
      return
    }
    const num = parseInt(digits, 10)
    if (isNaN(num)) return
    if (max != null && num > max) return
    setRaw(String(num))
    setDisplay(format(num))
  }

  function handleBlur() {
    if (raw === '') return
    const num = parseInt(raw, 10)
    if (min != null && num < min) {
      setRaw(String(min))
      setDisplay(format(min))
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <input
        type="text"
        inputMode="numeric"
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
