'use client'

import { useState, useEffect } from 'react'

interface DatetimeLocalInputProps {
  name: string
  defaultToNow?: boolean
  defaultValue?: string
  required?: boolean
  className?: string
  /** When true, also renders a hidden input `<name>_tz_offset` with the browser's UTC offset in minutes */
  withTzOffset?: boolean
}

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function DatetimeLocalInput({ name, defaultToNow, defaultValue, required, className, withTzOffset }: DatetimeLocalInputProps) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [tzOffset, setTzOffset] = useState(0)

  useEffect(() => {
    setTzOffset(-new Date().getTimezoneOffset()) // offset in minutes (positive = ahead of UTC)
    if (defaultToNow && !defaultValue) {
      setValue(toLocalDatetimeValue(new Date()))
    }
  }, [])

  return (
    <>
      <input
        name={name}
        type="datetime-local"
        value={value}
        onChange={e => setValue(e.target.value)}
        required={required}
        className={className}
      />
      {withTzOffset && <input type="hidden" name={`${name}_tz_offset`} value={tzOffset} />}
    </>
  )
}
