'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface QuotationItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  itemType: string
  customer_response: string | null
}

interface PageData {
  quotationNumber: string
  otNumber: string
  vehiclePlate: string
  vehicleLabel: string
  customerName: string
  workshopName: string
  workshopLogoUrl: string | null
  items: QuotationItem[]
  alreadyResponded: boolean
  subtotal: number
  taxAmount: number
  total: number
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

export default function QuotationRespondPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]       = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  useEffect(() => {
    fetch(`/api/quotation/respond?token=${token}`)
      .then(r => r.json())
      .then((d: PageData & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        // Pre-fill any already-decided items
        const pre: Record<string, 'approved' | 'rejected'> = {}
        d.items.forEach(i => {
          if (i.customer_response === 'approved' || i.customer_response === 'rejected') {
            pre[i.id] = i.customer_response
          }
        })
        setDecisions(pre)
        setLoading(false)
      })
      .catch(() => { setError('Error cargando la cotización'); setLoading(false) })
  }, [token])

  const logoHeader = data ? (
    <div style={{ background: '#1F2937', padding: '24px 32px', textAlign: 'center', borderRadius: '16px 16px 0 0' }}>
      <img src="/logo-ark-slogan.png" alt="ARK Workshop" style={{ height: 48, display: 'inline-block' }} />
    </div>
  ) : null

  const workshopStrip = data?.workshopName ? (
    <div style={{ padding: '12px 32px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {data.workshopLogoUrl && (
          <img src={data.workshopLogoUrl} alt={data.workshopName} style={{ height: 32, maxWidth: 120, objectFit: 'contain' }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>{data.workshopName}</span>
      </div>
      <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>en nombre de</span>
    </div>
  ) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280' }}>Cargando cotización…</p>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 20 }}>Enlace no válido</h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>Este enlace no existe o ya no está disponible.</p>
      </div>
    </div>
  )

  const allDecided = data.items.every(i => decisions[i.id])
  const hasApproval = Object.values(decisions).some(d => d === 'approved')

  const handleSubmit = async () => {
    if (!allDecided) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/quotation/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decisions }),
      })
      const json = await res.json()
      if (json.ok) {
        setSubmitted(true)
      } else {
        alert(json.error ?? 'Error al enviar la respuesta')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    maxWidth: 560,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  }

  if (data.alreadyResponded || submitted) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '40px 16px' }}>
      <div style={cardStyle}>
        {logoHeader}
        {workshopStrip}
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#F0FDF4', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>✅</div>
          <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 22 }}>¡Gracias por tu respuesta!</h2>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Ya registramos tu respuesta sobre la cotización <strong>{data.quotationNumber}</strong>.
            El taller recibirá una notificación.
          </p>
        </div>
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '20px 32px', background: '#FAFAFA', textAlign: 'center' }}>
          <img src="/logo-ark.png" alt="ARK" style={{ height: 24, opacity: 0.4, display: 'inline-block' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '40px 16px' }}>
      <div style={cardStyle}>
        {logoHeader}
        <div style={{ height: 4, background: '#FF7316' }} />
        {workshopStrip}
        <div style={{ padding: '32px 32px 0' }}>
          <div style={{ width: 56, height: 56, background: '#FFF7ED', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>📋</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Cotización {data.quotationNumber}</h1>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6B7280' }}>
            Hola <strong style={{ color: '#1F2937' }}>{data.customerName}</strong>, te enviamos la cotización de los trabajos para tu vehículo{' '}
            <strong style={{ color: '#1F2937' }}>{data.vehicleLabel} · {data.vehiclePlate}</strong> (OT {data.otNumber}).
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#9CA3AF' }}>
            Por favor indica para cada ítem si deseas aprobarlo o rechazarlo.
          </p>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {data.items.map(item => {
              const dec = decisions[item.id]
              return (
                <div key={item.id} style={{
                  border: `1px solid ${dec === 'approved' ? '#6EE7B7' : dec === 'rejected' ? '#FECACA' : '#E5E7EB'}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: dec === 'approved' ? '#F0FDF4' : dec === 'rejected' ? '#FFF5F5' : '#FAFAFA',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{item.description}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                        {item.quantity} × {fmt(item.unitPrice)}
                        <span style={{ marginLeft: 8, fontWeight: 600, color: '#1F2937' }}>{fmt(item.subtotal)}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setDecisions(prev => ({ ...prev, [item.id]: 'approved' }))}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: dec === 'approved' ? '#059669' : '#E5E7EB',
                          color: dec === 'approved' ? '#fff' : '#374151',
                          transition: 'all 0.15s',
                        }}
                      >✓ Aprobar</button>
                      <button
                        onClick={() => setDecisions(prev => ({ ...prev, [item.id]: 'rejected' }))}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: dec === 'rejected' ? '#DC2626' : '#E5E7EB',
                          color: dec === 'rejected' ? '#fff' : '#374151',
                          transition: 'all 0.15s',
                        }}
                      >✗ Rechazar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '2px solid #1F2937', paddingTop: 12, marginBottom: 28 }}>
            {data.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmt(data.subtotal)}</span>
              </div>
            )}
            {data.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
                <span>IVA</span><span>{fmt(data.taxAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
              <span>Total</span><span>{fmt(data.total)}</span>
            </div>
          </div>

          {!allDecided && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
              Decide todos los ítems para enviar tu respuesta.
            </p>
          )}

          <button
            disabled={!allDecided || submitting}
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: 'none', cursor: allDecided ? 'pointer' : 'not-allowed',
              background: allDecided ? '#1F2937' : '#D1D5DB',
              color: allDecided ? '#fff' : '#9CA3AF',
              marginBottom: 32,
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Enviando…' : hasApproval ? 'Confirmar respuesta →' : 'Confirmar (rechazar todo) →'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid #F3F4F6', padding: '20px 32px', background: '#FAFAFA', textAlign: 'center' }}>
          <img src="/logo-ark.png" alt="ARK" style={{ height: 24, opacity: 0.4, display: 'inline-block' }} />
        </div>
      </div>
    </div>
  )
}
