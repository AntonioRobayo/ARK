'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function SuperAdminTabs() {
  const pathname = usePathname()
  const t = useTranslations('superadmin')

  const SUPERADMIN_NAV = [
    { href: '/superadmin',           label: t('tabs.workshops') },
    { href: '/superadmin/licenses',  label: t('tabs.licenses') },
    { href: '/superadmin/users',     label: t('tabs.users') },
    { href: '/superadmin/catalogs',  label: t('tabs.catalogs') },
  ]

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit">
      {SUPERADMIN_NAV.map(item => {
        const isActive = item.href === '/superadmin'
          ? pathname === '/superadmin'
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
