'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Finding {
  id: string
  description: string
  severity: 'minor' | 'moderate' | 'critical'
  status: string
}

interface PageData {
  otNumber: string
  vehiclePlate: string
  customerName: string
  workshopName: string
  findings: Finding[]
  alreadyResponded: boolean
}

const SEVERITY_LABEL: Record<string, string> = {
  minor:    'Menor',
  moderate: 'Moderado',
  critical: 'Crítico',
}

const SEVERITY_COLOR: Record<string, string> = {
  minor:    '#D97706',
  moderate: '#EA580C',
  critical: '#DC2626',
}

export default function FindingsRespondPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [decisions, setDecisions] = useState<Record<string, 'approve_quote' | 'note_only'>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/findings/respond?token=${token}&action=load`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (d.findings) {
          const initial: Record<string, 'approve_quote' | 'note_only'> = {}
          d.findings.forEach((f: Finding) => { initial[f.id] = 'approve_quote' })
          setDecisions(initial)
        }
      })
      .catch(() => setError('No pudimos cargar los hallazgos.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/findings/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decisions }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Hubo un error al enviar tu respuesta. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const base: React.CSSProperties = {
    margin: 0, padding: 0, background: '#F3F4F6',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    minHeight: '100vh',
  }
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    maxWidth: 520, width: '100%', overflow: 'hidden',
  }
  const header: React.CSSProperties = {
    background: '#1F2937', padding: '20px 32px', textAlign: 'center',
  }

  const logoHeader = (
    <div style={header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-ark-slogan.png" alt="ARK Workshop" style={{ height: 48, width: 'auto', display: 'inline-block' }} />
    </div>
  )

  if (loading) return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={card}>
        {logoHeader}
        <div style={{ borderTop: '4px solid #FF7316' }} />
        <div style={{ padding: '48px 32px', textAlign: 'center', color: '#6B7280' }}>Cargando hallazgos…</div>
      </div>
    </div>
  )

  if (error && !data) return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={card}>
        {logoHeader}
        <div style={{ borderTop: '4px solid #FF7316' }} />
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❓</div>
          <p style={{ color: '#6B7280' }}>{error}</p>
        </div>
      </div>
    </div>
  )

  if (submitted || data?.alreadyResponded) return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={card}>
        {logoHeader}
        <div style={{ borderTop: '4px solid #FF7316' }} />
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{data?.alreadyResponded ? '✓' : '✅'}</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
            {data?.alreadyResponded ? 'Ya registramos tu respuesta' : '¡Respuesta enviada!'}
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>
            {data?.alreadyResponded
              ? 'Esta solicitud ya fue respondida anteriormente. Si tienes dudas, contáctanos.'
              : 'El equipo del taller ya tiene tu respuesta y procederá en consecuencia.'}
          </p>
        </div>
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '20px 32px', background: '#FAFAFA', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ark.png" alt="ARK Workshop" style={{ height: 24, width: 'auto', opacity: 0.5 }} />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={card}>
        {logoHeader}
        <div style={{ borderTop: '4px solid #FF7316' }} />
        <div style={{ padding: '32px 32px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
              Hallazgos en tu vehículo
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
              Hola <strong>{data?.customerName}</strong>, encontramos lo siguiente en tu <strong>{data?.vehiclePlate}</strong> (OT {data?.otNumber}).
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9CA3AF' }}>
              Indica qué prefieres hacer con cada hallazgo.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data?.findings.map(f => (
              <div key={f.id} style={{
                border: '1.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 700,
                    color: SEVERITY_COLOR[f.severity], textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 4,
                  }}>
                    {SEVERITY_LABEL[f.severity]}
                  </span>
                  <p style={{ margin: 0, fontSize: 14, color: '#1F2937', fontWeight: 500 }}>{f.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 0 }}>
                  <button
                    onClick={() => setDecisions(d => ({ ...d, [f.id]: 'approve_quote' }))}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, borderRight: '1px solid #E5E7EB',
                      background: decisions[f.id] === 'approve_quote' ? '#DCFCE7' : '#FAFAFA',
                      color: decisions[f.id] === 'approve_quote' ? '#16A34A' : '#6B7280',
                      transition: 'background 0.15s',
                    }}
                  >
                    ✅ Cotizar
                  </button>
                  <button
                    onClick={() => setDecisions(d => ({ ...d, [f.id]: 'note_only' }))}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                      background: decisions[f.id] === 'note_only' ? '#FEF9C3' : '#FAFAFA',
                      color: decisions[f.id] === 'note_only' ? '#A16207' : '#6B7280',
                      transition: 'background 0.15s',
                    }}
                  >
                    📌 Solo nota
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#DC2626', textAlign: 'center' }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              display: 'block', width: '100%', marginTop: 20,
              padding: '14px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, color: '#fff',
              background: submitting ? '#9CA3AF' : '#1F2937',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Enviando…' : 'Confirmar respuesta'}
          </button>
        </div>
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 32px', background: '#FAFAFA', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ark.png" alt="ARK Workshop" style={{ height: 24, width: 'auto', opacity: 0.5 }} />
        </div>
      </div>
    </div>
  )
}
