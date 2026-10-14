'use client'

import { useEffect, useState } from 'react'

interface LocalDateProps {
  date: string | Date
  options?: Intl.DateTimeFormatOptions
  className?: string
}

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}

export function LocalDate({ date, options = DATETIME_OPTIONS, className }: LocalDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null)

  useEffect(() => {
    const d = typeof date === 'string' ? new Date(date) : date
    setFormatted(d.toLocaleString(undefined, options))
  }, [date])

  if (formatted === null) {
    // Server render placeholder — same date, UTC, no timezone ambiguity shown
    const d = typeof date === 'string' ? new Date(date) : date
    return <span className={className}>{d.toISOString().replace('T', ' ').slice(0, 16)} UTC</span>
  }

  return <span className={className}>{formatted}</span>
}

export function LocalDateOnly({ date, options = DATE_OPTIONS, className }: LocalDateProps) {
  return <LocalDate date={date} options={options} className={className} />
}
