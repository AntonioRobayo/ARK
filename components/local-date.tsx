'use client'

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
  const d = typeof date === 'string' ? new Date(date) : date
  return (
    <span suppressHydrationWarning className={className}>
      {d.toLocaleString(undefined, options)}
    </span>
  )
}

export function LocalDateOnly({ date, options = DATE_OPTIONS, className }: LocalDateProps) {
  return <LocalDate date={date} options={options} className={className} />
}
