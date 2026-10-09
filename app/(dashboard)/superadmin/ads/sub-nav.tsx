'use client'

import Link from 'next/link'

export function AdSubNav({ active }: { active: 'campaigns' | 'placements' }) {
  const tabs = [
    { key: 'campaigns',  href: '/superadmin/ads',            label: 'Campañas' },
    { key: 'placements', href: '/superadmin/ads/placements', label: 'Espacios publicitarios' },
  ]
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit mb-5">
      {tabs.map(t => (
        <Link key={t.key} href={t.href}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
