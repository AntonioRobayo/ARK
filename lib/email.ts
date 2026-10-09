import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    authMethod:        'PLAIN',
    tls: {
      rejectUnauthorized: false,
      secureProtocol:     'TLSv1_2_method',
    },
    connectionTimeout: 60000,
    greetingTimeout:   30000,
    socketTimeout:     60000,
  })
}

const FROM = () =>
  `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`

interface SendEmailOptions {
  to:      string | string[]
  subject: string
  html:    string
  text?:   string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transporter = createTransporter()
  await transporter.sendMail({
    from:    FROM(),
    to:      Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  })
}

// ─── Template de marca ARK ────────────────────────────────────────────────────

export function arkEmailLayout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 580px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: #0f172a; padding: 28px 32px; }
    .header-brand { color: #e8d5a3; font-size: 20px; font-weight: 700; letter-spacing: -.3px; margin: 0; }
    .header-sub { color: #64748b; font-size: 12px; margin: 4px 0 0; }
    .body { padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.6; }
    .body h2 { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #0f172a; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; margin: 8px 0 16px; }
    .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; }
    .cred-box strong { display: inline-block; width: 100px; color: #64748b; font-weight: 500; }
    .cred-box span { color: #0f172a; font-weight: 600; }
    .warn { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 16px 0; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; }
    .footer p { color: #94a3b8; font-size: 11px; margin: 0 0 4px; }
    .footer a { color: #64748b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="header-brand">ARK Workshop</p>
        <p class="header-sub">Sistema de gestión de talleres</p>
      </div>
      <div class="body">
        <h2>${title}</h2>
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>Este correo fue enviado automáticamente por ARK Workshop.</p>
        <p>¿Tienes dudas? Escríbenos a <a href="mailto:${process.env.EMAIL_FROM_EMAIL}">${process.env.EMAIL_FROM_EMAIL}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
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
  const html = arkEmailLayout('Bienvenido a ARK Workshop', `
    <p>Has sido invitado a administrar el taller <strong>${workshopName}</strong> en ARK Workshop.</p>
    <p>Haz clic en el botón para activar tu cuenta y crear tu contraseña:</p>
    <a href="${inviteUrl}" class="btn">Activar mi cuenta →</a>
    <div class="warn">
      ⚠️ Este enlace expira en 24 horas. Si no lo solicitaste, ignora este correo.
    </div>
    <p style="color:#64748b; font-size:13px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
    <a href="${inviteUrl}" style="color:#0f172a; word-break:break-all;">${inviteUrl}</a></p>
  `)

  await sendEmail({ to, subject: `Invitación a ARK Workshop — ${workshopName}`, html })
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string
  resetUrl: string
}) {
  const html = arkEmailLayout('Restablecer contraseña', `
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en ARK Workshop.</p>
    <p>Haz clic en el botón para crear una nueva contraseña:</p>
    <a href="${resetUrl}" class="btn">Restablecer contraseña →</a>
    <div class="warn">
      ⚠️ Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.
    </div>
  `)

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
  const html = arkEmailLayout('Tu licencia vence hoy', `
    <p>Hola,</p>
    <p>Te informamos que la licencia <strong>${planName}</strong> del taller <strong>${workshopName}</strong> vence <strong>hoy</strong>.</p>
    <div class="warn">
      ⚠️ Si no renuevas tu licencia, mañana no podrás acceder a la plataforma.
    </div>
    <p>Para renovar o ampliar tu plan, comunícate con nuestro equipo de soporte:</p>
    <a href="mailto:${process.env.EMAIL_FROM_EMAIL}" class="btn">Contactar soporte →</a>
    <p style="color:#64748b; font-size:13px;">Gracias por confiar en ARK Workshop.</p>
  `)

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
  const html = arkEmailLayout('Tu licencia ha vencido', `
    <p>Hola,</p>
    <p>La licencia <strong>${planName}</strong> del taller <strong>${workshopName}</strong> <strong>venció ayer</strong> y el acceso a la plataforma ha sido bloqueado.</p>
    <div class="warn">
      🔒 Tu taller no puede acceder a ARK Workshop hasta que se renueve la licencia.
    </div>
    <p>Para reactivar tu cuenta, comunícate con nuestro equipo de soporte a la brevedad:</p>
    <a href="mailto:${process.env.EMAIL_FROM_EMAIL}" class="btn">Reactivar mi cuenta →</a>
    <p style="color:#64748b; font-size:13px;">Gracias por confiar en ARK Workshop.</p>
  `)

  await sendEmail({ to, subject: `🔒 Licencia vencida — ${workshopName}`, html })
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
  const html = arkEmailLayout(`Actualización OT ${otNumber}`, `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p>Tu vehículo <strong>${vehiclePlate}</strong> tiene una actualización en su orden de trabajo:</p>
    <div class="cred-box">
      <div><strong>OT:</strong> <span>${otNumber}</span></div>
      <div><strong>Estado:</strong> <span>${status}</span></div>
      ${notes ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0; color:#475569;">${notes}</div>` : ''}
    </div>
    <p style="color:#64748b; font-size:13px;">Para más información contacta al taller directamente.</p>
  `)

  await sendEmail({ to, subject: `OT ${otNumber} — ${status} | ARK Workshop`, html })
}
