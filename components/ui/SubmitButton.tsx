'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  disabled?: boolean
}

export function SubmitButton({ children, pendingLabel, className, disabled }: Props) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
