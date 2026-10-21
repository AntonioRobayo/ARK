export default async function FindingsThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const { action } = await searchParams

  const isApprove = action === 'approve_quote'
  const isNote    = action === 'note_only'
  const isAlready = action === 'already'

  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ARK Workshop</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#F3F4F6', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 480, width: '100%', overflow: 'hidden' }}>
            <div style={{ background: '#1F2937', padding: '28px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FF7316', letterSpacing: '0.1em', textTransform: 'uppercase' }}>ARK Workshop</div>
            </div>
            <div style={{ borderTop: '4px solid #FF7316' }} />
            <div style={{ padding: '40px 40px 36px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {isApprove ? '✅' : isNote ? '📌' : isAlready ? '✓' : '❓'}
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
                {isApprove ? '¡Recibido! Procederemos a cotizar'
                 : isNote   ? 'Registrado para una próxima visita'
                 : isAlready ? 'Ya registramos tu respuesta'
                 : 'Respuesta registrada'}
              </h1>
              <p style={{ margin: '0 0 8px', fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>
                {isApprove
                  ? 'El equipo del taller preparará una cotización con los hallazgos identificados y se pondrá en contacto contigo pronto.'
                  : isNote
                  ? 'Los hallazgos quedan registrados en el historial de tu vehículo. El equipo los tendrá en cuenta en tu próxima visita.'
                  : isAlready
                  ? 'Esta respuesta ya fue registrada anteriormente. Si tienes dudas, contáctanos directamente.'
                  : 'Tu respuesta ha sido registrada. Gracias.'}
              </p>
            </div>
            <div style={{ borderTop: '1px solid #F3F4F6', padding: '20px 40px', background: '#FAFAFA', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                ARK Workshop · <em>Todo tu taller. En un solo lugar.</em>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
