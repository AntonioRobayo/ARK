export function LicenseBlockedScreen({ type }: { type: 'suspended' | 'expired' }) {
  const isSuspended = type === 'suspended'

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="max-w-md w-full text-center px-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isSuspended ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          {isSuspended ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isSuspended ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isSuspended ? 'Cuenta suspendida' : 'Licencia vencida'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {isSuspended
            ? 'Tu cuenta ha sido suspendida. Contacta al soporte para reactivarla.'
            : 'Tu licencia de ARK Workshop ha vencido. Renuévala para continuar usando la plataforma.'}
        </p>

        <a
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'soporte@arkworkshop.app'}`}
          className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
          style={{ backgroundColor: '#FF7316' }}
        >
          Contactar soporte
        </a>
      </div>
    </div>
  )
}
