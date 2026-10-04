import Link from 'next/link'

const sections = [
  {
    href: '/settings/services',
    title: 'Catálogo de servicios',
    description: 'Servicios estándar del taller, precios base y tiempos estimados',
    icon: '🔧',
  },
  {
    href: '/settings/taxes',
    title: 'Tasas de impuesto',
    description: 'IVA y otros impuestos aplicables a facturas',
    icon: '📊',
  },
  {
    href: '/settings/payment-methods',
    title: 'Métodos de pago',
    description: 'Efectivo, transferencia, tarjeta, etc.',
    icon: '💳',
  },
  {
    href: '/settings/cash-registers',
    title: 'Cajas',
    description: 'Puntos de caja para registro de pagos',
    icon: '🏧',
  },
  {
    href: '/auth/update-password?from=settings',
    title: 'Cambiar contraseña',
    description: 'Actualiza la contraseña de tu cuenta',
    icon: '🔑',
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Parámetros del taller</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="text-2xl mb-3">{s.icon}</div>
            <p className="font-semibold text-gray-900 group-hover:text-slate-700">{s.title}</p>
            <p className="text-sm text-gray-400 mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
