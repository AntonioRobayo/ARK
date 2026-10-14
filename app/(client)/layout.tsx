import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Portal del Cliente — ARK Workshop',
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FFFFFF', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white"
      >
        <a href="/portal" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none"
            style={{ backgroundColor: '#FF7316' }}
          >
            A
          </div>
          <span className="font-semibold text-gray-900 text-sm">ARK Workshop</span>
        </a>

        {user && displayName && (
          <p className="text-xs text-gray-500 truncate max-w-[180px]">{displayName}</p>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <span className="font-semibold" style={{ color: '#FF7316' }}>
            ARK Workshop
          </span>
        </p>
      </footer>
    </div>
  )
}
