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
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="rounded-2xl px-8 py-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-ark-slogan.png"
              alt="ARK — Todo tu taller. En un solo lugar."
              style={{ height: '64px', width: 'auto', display: 'block' }}
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
