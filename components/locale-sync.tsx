'use client'

import { useEffect } from 'react'

export function LocaleSync({ dbLocale }: { dbLocale: string }) {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)ARK_LOCALE=([^;]+)/)
    const cookieLocale = match?.[1]
    if (!cookieLocale || cookieLocale !== dbLocale) {
      const maxAge = 60 * 60 * 24 * 365
      document.cookie = `ARK_LOCALE=${dbLocale}; path=/; max-age=${maxAge}; SameSite=Lax`
    }
  }, [dbLocale])

  return null
}
