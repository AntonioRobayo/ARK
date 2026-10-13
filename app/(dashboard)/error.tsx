'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-900 mb-1">Ocurrió un error</p>
        <p className="text-sm text-gray-500 max-w-sm">
          {error.message || 'Error inesperado. Por favor intenta de nuevo.'}
        </p>
        {error.digest && <p className="text-xs text-gray-300 mt-1 font-mono">{error.digest}</p>}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
