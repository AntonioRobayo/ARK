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

export function arkEmailLayout(title: string, bodyHtml: string, icon = '📬') {
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
            <img src="${LOGO_URL}" alt="ARK Workshop" width="200"
              style="display:block;margin:0 auto;height:auto;" />
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background-color:#ffffff;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td height="4" style="background-color:#FF7316;font-size:0;line-height:0;">&nbsp;</td></tr>
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
  otNumber,
  vehiclePlate,
  findings,
  approveUrl,
  noteUrl,
}: {
  to: string
  customerName: string
  workshopName: string
  otNumber: string
  vehiclePlate: string
  findings: { description: string; severity: 'minor' | 'moderate' | 'critical' }[]
  approveUrl: string
  noteUrl: string
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
      <strong style="color:#1F2937;">${vehiclePlate}</strong> (OT ${otNumber})
      nuestro equipo encontró lo siguiente:
    </p>

    <div style="margin-bottom:28px;">${findingsHtml}</div>

    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.7;">
      ¿Qué prefieres que hagamos?
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td align="center" bgcolor="#16A34A" style="border-radius:10px;">
          <a href="${approveUrl}"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;background-color:#16A34A;">
            ✅ Sí, cotícenlo
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="border-radius:10px;border:1.5px solid #E5E7EB;">
          <a href="${noteUrl}"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#374151;text-decoration:none;border-radius:10px;background-color:#FFFFFF;">
            📌 Solo registrar como nota
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;margin-bottom:0;">
      <tr>
        <td style="padding:14px 20px;font-size:12px;color:#9CA3AF;line-height:1.6;">
          Al elegir <strong style="color:#6B7280;">"Sí, cotícenlo"</strong> el equipo del taller preparará una cotización formal.
          Al elegir <strong style="color:#6B7280;">"Solo registrar como nota"</strong> queda en el historial de tu vehículo para una visita futura, sin costo adicional hoy.
        </td>
      </tr>
    </table>
  `

  const html = arkEmailLayout(`Hallazgos en tu vehículo — OT ${otNumber}`, body, '🔍')
  await sendEmail({
    to,
    subject: `🔍 Revisamos tu ${vehiclePlate} y encontramos algo — OT ${otNumber}`,
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

  const html = arkEmailLayout(`Actualización OT ${otNumber}`, body, '🔧')
  await sendEmail({ to, subject: `OT ${otNumber} — ${status} | ARK Workshop`, html })
}
