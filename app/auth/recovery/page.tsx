'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function RecoveryPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const type          = params.get('type')

    if (type === 'recovery' && access_token && refresh_token) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setErrorMsg(error.message)
          setStatus('error')
        } else {
          router.replace('/auth/update-password')
        }
      })
    } else {
      setErrorMsg('Link inválido o expirado')
      setStatus('error')
    }
  }, [router])

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <p className="text-sm text-red-600">{errorMsg}</p>
        <a href="/auth/login" className="text-sm text-orange-500 hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <p className="text-sm text-gray-500">Verificando enlace…</p>
    </div>
  )
}
