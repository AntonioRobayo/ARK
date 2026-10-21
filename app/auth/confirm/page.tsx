'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) {
      setStatus('error')
      setErrorMsg('Link inválido o expirado')
      return
    }

    const params = new URLSearchParams(hash.substring(1))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type         = params.get('type')

    if (!accessToken || !refreshToken) {
      setStatus('error')
      setErrorMsg('Link inválido o expirado')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setErrorMsg('Link inválido o expirado')
          return
        }
        if (type === 'invite' || type === 'signup') {
          router.replace('/auth/update-password')
        } else if (type === 'recovery') {
          router.replace('/auth/update-password?from=recovery')
        } else {
          router.replace('/dashboard')
        }
      })
  }, [router])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-2">{errorMsg}</p>
          <p className="text-gray-500 text-sm mb-4">
            Este link ya expiró o fue usado. Solicita un nuevo enlace al administrador de tu taller.
          </p>
          <a href="/auth/login" className="text-sm text-blue-600 hover:underline">
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm">Verificando tu acceso...</p>
      </div>
    </div>
  )
}
