export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* ARK Logo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <polygon points="16,3 30,29 2,29" fill="none" stroke="#FF7316" strokeWidth="2.5" strokeLinejoin="round"/>
              <line x1="7.5" y1="22" x2="24.5" y2="22" stroke="#FF7316" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <div className="text-left">
              <p className="font-bold text-white text-2xl" style={{ letterSpacing: '0.12em' }}>ARK</p>
              <p style={{ color: '#FF7316', fontSize: '9px', letterSpacing: '0.2em', marginTop: '-3px' }} className="font-semibold uppercase">Workshop</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Todo tu taller. En un solo lugar.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
