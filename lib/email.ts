import { Resend } from 'resend'

const FROM = () =>
  `"${process.env.EMAIL_FROM_NAME ?? 'ARK Workshop'}" <${process.env.EMAIL_FROM_EMAIL ?? 'noreply@devassetsconsulting.com'}>`

const SUPPORT_EMAIL = () => process.env.EMAIL_FROM_EMAIL ?? 'soporte@devassetsconsulting.com'

const LOGO_URL     = 'https://rjcumppemoonwoolqmpz.supabase.co/storage/v1/object/public/assets/email/logo-ark-slogan.png'
const DA_LOGO_URL  = 'https://rjcumppemoonwoolqmpz.supabase.co/storage/v1/object/public/assets/email/logo-da.png'

interface SendEmailOptions {
  to:      string | string[]
  subject: string
  html:    string
  text?:   string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from:    FROM(),
    to:      Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  })
  if (error) throw new Error(error.message)
}

// ─── Layout base (table-based, email-client safe) ─────────────────────────────

export function arkEmailLayout(
  title: string,
  bodyHtml: string,
  icon = '📬',
  opts?: { workshopName?: string; workshopLogoUrl?: string },
) {
  const workshopStrip = opts?.workshopName ? `
    <tr>
      <td style="padding:14px 40px;border-bottom:1px solid #F3F4F6;background-color:#FAFAFA;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td valign="middle">
              ${opts.workshopLogoUrl
                ? `<img src="${opts.workshopLogoUrl}" alt="${opts.workshopName}" height="32"
                    style="display:inline-block;height:32px;width:auto;max-width:140px;object-fit:contain;vertical-align:middle;margin-right:10px;" />`
                : ''}
              <span style="font-size:13px;font-weight:600;color:#1F2937;vertical-align:middle;">${opts.workshopName}</span>
            </td>
            <td align="right" valign="middle">
              <span style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;">en nombre de</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:40px 16px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background-color:#1F2937;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="ARK Workshop" width="200" style="display:block;margin:0 auto;height:auto;" />
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background-color:#ffffff;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td height="4" style="background-color:#FF7316;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${workshopStrip}
        <tr>
          <td style="padding:40px 40px 36px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="56" height="56"
                  style="background-color:#FFF7ED;border-radius:28px;text-align:center;vertical-align:middle;font-size:24px;line-height:56px;">
                  ${icon}
                </td>
              </tr>
            </table>
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1F2937;line-height:1.3;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #F3F4F6;padding:22px 40px;background-color:#FAFAFA;border-radius:0 0 16px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1F2937;">ARK Workshop</p>
                  <p style="margin:0;font-size:11px;color:#9CA3AF;font-style:italic;">Todo tu taller. En un solo lugar.</p>
                </td>
                <td align="right" valign="middle">
                  <p style="margin:0 0 4px;font-size:9px;color:#D1D5DB;text-transform:uppercase;letter-spacing:0.1em;">A product by</p>
                  <img src="${DA_LOGO_URL}" alt="Developing Assets" width="88"
                    style="display:block;height:auto;opacity:0.45;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:18px;">
        <tr><td align="center">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">
            Enviado desde <strong style="color:#6B7280;">${SUPPORT_EMAIL()}</strong>
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`
}

// ─── Bloque reutilizable: botón CTA ──────────────────────────────────────────

function btnBlock(label: string, url: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr>
      <td align="center" bgcolor="#FF7316" style="border-radius:10px;">
        <a href="${url}"
          style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;background-color:#FF7316;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

// ─── Bloque reutilizable: aviso de seguridad ─────────────────────────────────

function securityNotice(text: string) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;margin-bottom:28px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">
          Información importante
        </p>
        <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">${text}</p>
      </td>
    </tr>
  </table>`
}

// ─── Bloque reutilizable: enlace alternativo ──────────────────────────────────

function fallbackLink(url: string) {
  return `
  <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
    <a href="${url}" style="color:#FF7316;word-break:break-all;text-decoration:underline;">${url}</a>
  </p>`
}

// ─── Bloque reutilizable: caja de datos ──────────────────────────────────────

function dataBox(rows: { label: string; value: string }[]) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:16px 20px;">
        ${rows.map((r, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            ${i > 0 ? 'style="border-top:1px solid #E5E7EB;margin-top:8px;padding-top:8px;"' : ''}>
            <tr>
              <td style="font-size:13px;color:#6B7280;width:120px;padding-right:12px;">${r.label}</td>
              <td style="font-size:13px;font-weight:600;color:#1F2937;">${r.value}</td>
            </tr>
          </table>`).join('')}
      </td>
    </tr>
  </table>`
}

// ─── Bloque reutilizable: alerta ──────────────────────────────────────────────

function alertBox(text: string, color: '#FFF7ED' | '#FEF2F2' = '#FFF7ED', textColor = '#92400E') {
  const borderColor = color === '#FEF2F2' ? '#FECACA' : '#FED7AA'
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${color};border:1px solid ${borderColor};border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 20px;font-size:13px;color:${textColor};line-height:1.6;">
        ${text}
      </td>
    </tr>
  </table>`
}

// ─── Templates por módulo ─────────────────────────────────────────────────────

export async function sendWorkshopInviteEmail({
  to,
  workshopName,
  inviteUrl,
}: {
  to: string
  workshopName: string
  inviteUrl: string
}) {
  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Has recibido una invitación para crear tu cuenta en
      <strong style="color:#1F2937;">ARK Workshop</strong> y administrar el taller
      <strong style="color:#1F2937;">${workshopName}</strong>.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Acepta la invitación para configurar tu cuenta y comenzar.
    </p>
    ${btnBlock('Aceptar invitación →', inviteUrl)}
    ${securityNotice('Este enlace está destinado exclusivamente a la persona invitada. Si no esperabas esta invitación, puedes ignorar este correo de forma segura.')}
    ${fallbackLink(inviteUrl)}
  `

  const html = arkEmailLayout('¡Te damos la bienvenida a ARK!', body, '✉')
  await sendEmail({ to, subject: `Invitación a ARK Workshop — ${workshopName}`, html })
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string
  resetUrl: string
}) {
  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en ARK Workshop.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Haz clic en el botón para crear una nueva contraseña.
    </p>
    ${btnBlock('Restablecer contraseña →', resetUrl)}
    ${securityNotice('Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.')}
    ${fallbackLink(resetUrl)}
  `

  const html = arkEmailLayout('Restablecer contraseña', body, '🔑')
  await sendEmail({ to, subject: 'Restablecer contraseña — ARK Workshop', html })
}

export async function sendLicenseExpiryTodayEmail({
  to,
  workshopName,
  planName,
}: {
  to: string
  workshopName: string
  planName: string
}) {
  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Te informamos que la licencia <strong style="color:#1F2937;">${planName}</strong>
      del taller <strong style="color:#1F2937;">${workshopName}</strong> vence <strong style="color:#1F2937;">hoy</strong>.
    </p>
    ${alertBox('⚠️ Tienes 3 días de gracia antes de perder el acceso a la plataforma. Renueva tu licencia para evitar interrupciones.')}
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Contacta a nuestro equipo para renovar o ampliar tu plan.
    </p>
    ${btnBlock('Contactar soporte →', `mailto:${SUPPORT_EMAIL()}`)}
  `

  const html = arkEmailLayout('Tu licencia vence hoy', body, '⏰')
  await sendEmail({ to, subject: `⚠️ Tu licencia ARK Workshop vence hoy — ${workshopName}`, html })
}

export async function sendLicenseExpiredEmail({
  to,
  workshopName,
  planName,
}: {
  to: string
  workshopName: string
  planName: string
}) {
  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      La licencia <strong style="color:#1F2937;">${planName}</strong>
      del taller <strong style="color:#1F2937;">${workshopName}</strong> venció ayer.
    </p>
    ${alertBox('🔒 El acceso a la plataforma será bloqueado en 2 días si no renuevas tu licencia.', '#FEF2F2', '#991B1B')}
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Contacta a nuestro equipo para reactivar tu cuenta a la brevedad.
    </p>
    ${btnBlock('Reactivar mi cuenta →', `mailto:${SUPPORT_EMAIL()}`)}
  `

  const html = arkEmailLayout('Tu licencia ha vencido', body, '🔒')
  await sendEmail({ to, subject: `🔒 Licencia vencida — ${workshopName}`, html })
}

export async function sendFindingNotificationEmail({
  to,
  customerName,
  workshopName,
  workshopLogoUrl,
  otNumber,
  vehiclePlate,
  findings,
  respondUrl,
}: {
  to: string
  customerName: string
  workshopName: string
  workshopLogoUrl?: string
  otNumber: string
  vehiclePlate: string
  findings: { description: string; severity: 'minor' | 'moderate' | 'critical' }[]
  respondUrl: string
}) {
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
  const SEVERITY_BG: Record<string, string> = {
    minor:    '#FFFBEB',
    moderate: '#FFF7ED',
    critical: '#FEF2F2',
  }

  const findingsHtml = findings.map(f => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:${SEVERITY_BG[f.severity]};border-left:3px solid ${SEVERITY_COLOR[f.severity]};border-radius:0 8px 8px 0;margin-bottom:10px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${SEVERITY_COLOR[f.severity]};">
                  ${SEVERITY_LABEL[f.severity]}
                </span>
                <p style="margin:4px 0 0;font-size:14px;color:#1F2937;line-height:1.5;">${f.description}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`).join('')

  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Hola <strong style="color:#1F2937;">${customerName}</strong>, durante la revisión de tu
      <strong style="color:#1F2937;">${vehiclePlate}</strong> (${otNumber})
      nuestro equipo encontró lo siguiente:
    </p>

    <div style="margin-bottom:24px;">${findingsHtml}</div>

    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.7;">
      Indícanos qué prefieres hacer con cada hallazgo — puedes decidir uno por uno.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" bgcolor="#1F2937" style="border-radius:10px;">
          <a href="${respondUrl}"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;background-color:#1F2937;">
            Ver y responder hallazgos →
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;margin-bottom:0;">
      <tr>
        <td style="padding:14px 20px;font-size:12px;color:#9CA3AF;line-height:1.6;">
          Podrás elegir para cada hallazgo si deseas que lo cotizemos o si prefieres dejarlo registrado como nota para una visita futura.
        </td>
      </tr>
    </table>
  `

  const html = arkEmailLayout(`Hallazgos en tu vehículo — ${otNumber}`, body, '🔍', { workshopName, workshopLogoUrl })
  await sendEmail({
    to,
    subject: `🔍 Revisamos tu ${vehiclePlate} y encontramos algo — ${otNumber}`,
    html,
  })
}

export async function sendOtStatusEmail({
  to,
  customerName,
  otNumber,
  status,
  vehiclePlate,
  notes,
}: {
  to: string
  customerName: string
  otNumber: string
  status: string
  vehiclePlate: string
  notes?: string
}) {
  const rows = [
    { label: 'Orden de trabajo', value: otNumber },
    { label: 'Vehículo', value: vehiclePlate },
    { label: 'Estado', value: status },
    ...(notes ? [{ label: 'Notas', value: notes }] : []),
  ]

  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Hola <strong style="color:#1F2937;">${customerName}</strong>,
      tu vehículo <strong style="color:#1F2937;">${vehiclePlate}</strong>
      tiene una actualización en su orden de trabajo.
    </p>
    ${dataBox(rows)}
    <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
      Para más información contacta al taller directamente.
    </p>
  `

  const html = arkEmailLayout(`Actualización ${otNumber}`, body, '🔧')
  await sendEmail({ to, subject: `${otNumber} — ${status} | ARK Workshop`, html })
}

// ─── OT abierta — email al cliente ───────────────────────────────────────────

export interface OtPhoto { thumbUrl: string; name: string }
export interface OtCustomerPart { description: string; quantity: number; condition: string; notes?: string | null }

export interface OtCustodyItem { description: string; location?: string | null }

export async function sendOtOpenedEmail({
  to, customerName, workshopName, workshopLogoUrl, otNumber, vehiclePlate, vehicleLabel,
  receptionNotes, estimatedDelivery, technicianName,
  photos, customerParts, custodyItems,
}: {
  to: string
  customerName: string
  workshopName: string
  workshopLogoUrl?: string | null
  otNumber: string
  vehiclePlate: string
  vehicleLabel: string
  receptionNotes?: string | null
  estimatedDelivery?: string | null
  technicianName?: string | null
  photos: OtPhoto[]
  customerParts: OtCustomerPart[]
  custodyItems: OtCustodyItem[]
}) {
  const CONDITION_LABEL: Record<string, string> = { new: 'Nuevo', used: 'Usado', damaged: 'Dañado' }

  const photosHtml = photos.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Fotos de recepción</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        ${photos.slice(0, 6).map(p => `
          <td style="padding:2px;">
            <img src="${p.thumbUrl}" alt="${p.name}"
              style="width:100px;height:75px;object-fit:cover;border-radius:6px;display:block;border:1px solid #E5E7EB;" />
          </td>`).join('')}
      </tr>
    </table>` : ''

  const partsHtml = customerParts.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Repuestos traídos por el cliente</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:12px 16px;">
        ${customerParts.map((p, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            ${i > 0 ? 'style="border-top:1px solid #E5E7EB;margin-top:8px;padding-top:8px;"' : ''}>
            <tr>
              <td style="font-size:13px;color:#1F2937;font-weight:600;">${p.description}${p.quantity > 1 ? ` <span style="color:#9CA3AF;font-weight:400;">× ${p.quantity}</span>` : ''}</td>
              <td align="right" style="font-size:12px;color:#6B7280;">${CONDITION_LABEL[p.condition] ?? p.condition}</td>
            </tr>
            ${p.notes ? `<tr><td colspan="2" style="font-size:12px;color:#9CA3AF;padding-top:2px;">${p.notes}</td></tr>` : ''}
          </table>`).join('')}
      </td></tr>
    </table>` : ''

  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Hola <strong>${customerName}</strong>, tu vehículo ha ingresado al taller
      <strong style="color:#1F2937;">${workshopName}</strong>.
      A continuación el resumen de recepción:
    </p>

    ${dataBox([
      { label: 'OT',          value: otNumber },
      { label: 'Vehículo',    value: `${vehicleLabel} · ${vehiclePlate}` },
      ...(technicianName  ? [{ label: 'Técnico',    value: technicianName }] : []),
      ...(estimatedDelivery ? [{ label: 'Entrega estimada', value: new Date(estimatedDelivery).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }] : []),
    ])}

    ${receptionNotes ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Notas de recepción</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#4B5563;line-height:1.6;">${receptionNotes}</td></tr>
    </table>` : ''}

    ${partsHtml}

    ${custodyItems.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Objetos dejados en custodia</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:12px 16px;">
        <p style="margin:0 0 8px;font-size:12px;color:#92400E;">
          Los siguientes objetos fueron registrados al momento del ingreso. Consérvelos hasta la entrega del vehículo.
        </p>
        ${custodyItems.map((c, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            ${i > 0 ? 'style="border-top:1px solid #FDE68A;margin-top:6px;padding-top:6px;"' : ''}>
            <tr>
              <td style="font-size:13px;color:#92400E;font-weight:600;">📦 ${c.description}</td>
              ${c.location ? `<td align="right" style="font-size:12px;color:#B45309;">${c.location}</td>` : ''}
            </tr>
          </table>`).join('')}
      </td></tr>
    </table>` : ''}

    ${photosHtml}

    <p style="margin:0 0 20px;font-size:13px;color:#9CA3AF;line-height:1.6;">
      Te mantendremos informado sobre el avance del servicio.
    </p>

    ${(() => {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
      return base ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;">
      <tr>
        <td align="center" style="border-radius:10px;" bgcolor="#FF7316">
          <a href="${base}/portal" target="_blank"
            style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
            Ver estado en el portal →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;text-align:center;">
      Ingresa con el mismo correo al que llegó este mensaje.
    </p>` : ''
    })()}
  `

  const html = arkEmailLayout(`Tu vehículo ingresó al taller`, body, '🔑', { workshopName, workshopLogoUrl: workshopLogoUrl ?? undefined })
  await sendEmail({
    to,
    subject: `${otNumber} — Ingreso de vehículo | ${workshopName}`,
    html,
  })
}

// ─── OT cerrada — email al cliente ───────────────────────────────────────────

export interface OtServiceItem { description: string; quantity: number; unitPrice: number; subtotal: number }

export async function sendOtClosedEmail({
  to, customerName, workshopName, workshopLogoUrl, otNumber, vehiclePlate, vehicleLabel,
  services, customerParts, photos, totalAmount, paidAmount,
}: {
  to: string
  customerName: string
  workshopName: string
  workshopLogoUrl?: string
  otNumber: string
  vehiclePlate: string
  vehicleLabel: string
  services: OtServiceItem[]
  customerParts: OtCustomerPart[]
  photos: OtPhoto[]
  totalAmount: number
  paidAmount: number
}) {
  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
  const CONDITION_LABEL: Record<string, string> = { new: 'Nuevo', used: 'Usado', damaged: 'Dañado' }

  const servicesHtml = services.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Servicios realizados</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:12px 16px;">
        ${services.map((s, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            ${i > 0 ? 'style="border-top:1px solid #E5E7EB;margin-top:8px;padding-top:8px;"' : ''}>
            <tr>
              <td style="font-size:13px;color:#1F2937;">${s.description}${s.quantity > 1 ? ` × ${s.quantity}` : ''}</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#1F2937;">${fmt(s.subtotal)}</td>
            </tr>
          </table>`).join('')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="border-top:2px solid #E5E7EB;margin-top:10px;padding-top:10px;">
          <tr>
            <td style="font-size:14px;font-weight:700;color:#1F2937;">Total</td>
            <td align="right" style="font-size:14px;font-weight:700;color:#1F2937;">${fmt(totalAmount)}</td>
          </tr>
          ${paidAmount > 0 ? `<tr>
            <td style="font-size:12px;color:#059669;">Pagado</td>
            <td align="right" style="font-size:12px;font-weight:600;color:#059669;">${fmt(paidAmount)}</td>
          </tr>` : ''}
          ${totalAmount - paidAmount > 0 ? `<tr>
            <td style="font-size:12px;color:#DC2626;">Saldo pendiente</td>
            <td align="right" style="font-size:12px;font-weight:600;color:#DC2626;">${fmt(totalAmount - paidAmount)}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>` : ''

  const partsHtml = customerParts.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Repuestos instalados (traídos por el cliente)</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:12px 16px;">
        ${customerParts.map((p, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            ${i > 0 ? 'style="border-top:1px solid #E5E7EB;margin-top:8px;padding-top:8px;"' : ''}>
            <tr>
              <td style="font-size:13px;color:#1F2937;font-weight:600;">${p.description}${p.quantity > 1 ? ` × ${p.quantity}` : ''}</td>
              <td align="right" style="font-size:12px;color:#6B7280;">${CONDITION_LABEL[p.condition] ?? p.condition}</td>
            </tr>
          </table>`).join('')}
      </td></tr>
    </table>` : ''

  const photosHtml = photos.length > 0 ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;">Registro fotográfico</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        ${photos.slice(0, 6).map(p => `
          <td style="padding:2px;">
            <img src="${p.thumbUrl}" alt="${p.name}"
              style="width:100px;height:75px;object-fit:cover;border-radius:6px;display:block;border:1px solid #E5E7EB;" />
          </td>`).join('')}
      </tr>
    </table>` : ''

  const body = `
    <p style="margin:0 0 18px;font-size:15px;color:#4B5563;line-height:1.7;">
      Hola <strong>${customerName}</strong>, tu vehículo
      <strong style="color:#1F2937;">${vehicleLabel} · ${vehiclePlate}</strong>
      está listo. Aquí el resumen de lo trabajado:
    </p>

    ${dataBox([
      { label: 'OT',       value: otNumber },
      { label: 'Vehículo', value: `${vehicleLabel} · ${vehiclePlate}` },
    ])}

    ${servicesHtml}
    ${partsHtml}
    ${photosHtml}

    <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
      Gracias por confiar en <strong>${workshopName}</strong>. Guarda este correo como soporte de los trabajos realizados.
    </p>
  `

  const html = arkEmailLayout(`Tu vehículo está listo`, body, '✅', { workshopName, workshopLogoUrl })
  await sendEmail({
    to,
    subject: `${otNumber} — Vehículo listo | ${workshopName}`,
    html,
  })
}

// ─── Cotización al cliente ────────────────────────────────────────────────────

export async function sendQuotationEmail({
  to,
  customerName,
  workshopName,
  workshopLogoUrl,
  termsAndConditions,
  respondUrl,
  otNumber,
  quotationNumber,
  vehiclePlate,
  vehicleLabel,
  items,
  subtotal,
  taxAmount,
  discountAmount,
  total,
}: {
  to: string
  customerName: string
  workshopName: string
  workshopLogoUrl?: string
  termsAndConditions?: string
  respondUrl?: string
  otNumber: string
  quotationNumber: string
  vehiclePlate: string
  vehicleLabel: string
  items: { description: string; quantity: number; unitPrice: number; subtotal: number; itemType: string }[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
}) {
  const fmt = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

  const itemRows = items.map(i => `
    <tr style="border-bottom:1px solid #F3F4F6;">
      <td style="padding:10px 0;font-size:13px;color:#1F2937;">${i.description}</td>
      <td style="padding:10px 0;font-size:13px;color:#6B7280;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 0;font-size:13px;color:#6B7280;text-align:right;">${fmt(i.unitPrice)}</td>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1F2937;text-align:right;">${fmt(i.subtotal)}</td>
    </tr>`).join('')

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Hola <strong>${customerName}</strong>, te enviamos la cotización de los trabajos para tu vehículo.
    </p>

    ${dataBox([
      { label: 'OT',        value: otNumber },
      { label: 'Cotización', value: quotationNumber },
      { label: 'Vehículo',   value: `${vehicleLabel} · ${vehiclePlate}` },
    ])}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;overflow:hidden;">
      <thead>
        <tr style="background-color:#F9FAFB;">
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6B7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Descripción</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6B7280;text-align:center;text-transform:uppercase;letter-spacing:0.05em;">Cant.</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6B7280;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Precio</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6B7280;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Subtotal</th>
        </tr>
      </thead>
      <tbody style="padding:0 12px;">${itemRows}</tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${discountAmount > 0 ? `<tr><td style="font-size:13px;color:#6B7280;padding:4px 0;">Subtotal</td><td style="font-size:13px;color:#6B7280;text-align:right;padding:4px 0;">${fmt(subtotal)}</td></tr>` : ''}
      ${taxAmount > 0 ? `<tr><td style="font-size:13px;color:#6B7280;padding:4px 0;">IVA</td><td style="font-size:13px;color:#6B7280;text-align:right;padding:4px 0;">${fmt(taxAmount)}</td></tr>` : ''}
      ${discountAmount > 0 ? `<tr><td style="font-size:13px;color:#6B7280;padding:4px 0;">Descuento</td><td style="font-size:13px;color:#6B7280;text-align:right;padding:4px 0;">-${fmt(discountAmount)}</td></tr>` : ''}
      <tr style="border-top:2px solid #1F2937;">
        <td style="font-size:16px;font-weight:700;color:#1F2937;padding-top:8px;">Total</td>
        <td style="font-size:16px;font-weight:700;color:#1F2937;text-align:right;padding-top:8px;">${fmt(total)}</td>
      </tr>
    </table>

    ${respondUrl ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" bgcolor="#1F2937" style="border-radius:10px;">
          <a href="${respondUrl}"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;background-color:#1F2937;">
            Revisar y aprobar cotización →
          </a>
        </td>
      </tr>
    </table>` : ''}

    <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
      Para cualquier consulta sobre esta cotización, comunícate con <strong>${workshopName}</strong>.
    </p>

    ${termsAndConditions ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-top:24px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;">Términos y condiciones</p>
          <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;white-space:pre-line;">${termsAndConditions}</p>
        </td>
      </tr>
    </table>` : ''}
  `

  const html = arkEmailLayout(`Cotización ${quotationNumber}`, body, '📋', { workshopName, workshopLogoUrl })
  await sendEmail({
    to,
    subject: `Cotización ${quotationNumber} — ${vehicleLabel} | ${workshopName}`,
    html,
  })
}
