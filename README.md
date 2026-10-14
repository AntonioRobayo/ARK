# ARK Workshop

SaaS para talleres de motocicletas. Gestión de órdenes de trabajo, clientes, vehículos, cotizaciones, facturación, inventario y portal del propietario.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) · TypeScript · Tailwind CSS · next-intl

---

## Inicio rápido

```bash
npm install
cp .env.local.example .env.local   # completar variables
npm run dev
```

La app corre en `http://localhost:3000`.

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Service role key (solo servidor) |
| `NEXT_PUBLIC_APP_URL` | ✓ | URL base de la app (ej: `https://ark.app`) |
| `RESEND_API_KEY` | ✓ | API key de Resend para emails transaccionales |
| `EMAIL_FROM_EMAIL` | ✓ | Dirección remitente de emails |
| `EMAIL_FROM_NAME` | | Nombre del remitente (default: "ARK Workshop") |
| `GOOGLE_CLIENT_ID` | Drive | Client ID del proyecto en Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Drive | Client secret de OAuth 2.0 |
| `GOOGLE_REDIRECT_URI` | Drive | `https://tu-dominio.com/api/auth/google/callback` |
| `GDRIVE_ENCRYPTION_KEY` | Drive | 32 bytes hex para cifrar el refresh token |
| `CRON_SECRET` | Cron | Bearer token para rutas de cron jobs |

Generar `GDRIVE_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Arquitectura de rutas

```
app/
├── (dashboard)/          # Panel del taller (requiere auth de staff)
│   ├── work-orders/      # Órdenes de trabajo
│   ├── customers/        # Clientes
│   ├── vehicles/         # Vehículos
│   ├── appointments/     # Agenda
│   ├── inventory/        # Inventario
│   ├── billing/          # Facturación
│   ├── reports/          # Reportes y KPIs
│   └── settings/         # Configuración del taller
│       ├── profile/
│       ├── services/
│       ├── users/        # RBAC — gestión de miembros
│       └── integrations/ # Google Drive y otros
│           └── manuals/  # Manuales internos del taller
├── (client)/             # Portal del propietario del vehículo
│   └── portal/
│       ├── auth/         # Magic link login
│       ├── vehicles/     # Historial por vehículo
│       ├── ot/           # Seguimiento de OT (polling ISR 30s)
│       ├── appointments/ # Agendar cita
│       └── [id]/         # Cotización pública (sin auth)
├── q/[id]/               # Aprobación de cotización (público)
├── api/
│   ├── auth/google/      # OAuth 2.0 Google Drive
│   └── drive/
│       ├── upload/       # Subida de fotos de OT
│       └── upload-manual/# Subida de manuales internos
└── superadmin/           # Panel de plataforma (rol superadmin)
```

---

## Integración Google Drive

El almacenamiento de fotos y documentos usa Google Drive en lugar de Supabase Storage, eliminando el costo de almacenamiento por taller.

### Configuración (una vez por instancia)

1. **Google Cloud Console** → crear proyecto, habilitar *Google Drive API*.
2. **Credenciales OAuth 2.0** tipo "Aplicación web". Scope: `https://www.googleapis.com/auth/drive.file`.
3. Agregar URI de redirección: `https://tu-dominio.com/api/auth/google/callback`.
4. Poner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y `GDRIVE_ENCRYPTION_KEY` en el entorno.

### Conectar un taller

El dueño del taller va a **Configuración → Integraciones** y hace clic en "Conectar con Google Drive". El flujo OAuth guarda el refresh token cifrado (AES-256-GCM) en la tabla `tenants`. Al conectar se crea la carpeta raíz `ARK Workshop — [Nombre del taller]` en el Drive de la cuenta elegida.

### Estructura de carpetas en Drive

```
ARK Workshop — Nombre del Taller/
│
├── Vehículos/
│   └── ABC-123 — Honda CB300/
│       ├── Recepción/              ← fotos al ingresar el vehículo
│       ├── OTs/
│       │   └── OT-0042/
│       │       ├── Diagnóstico/    ← fotos del diagnóstico
│       │       ├── Trabajo/        ← fotos en progreso
│       │       ├── Repuestos/      ← fotos de repuestos instalados
│       │       └── Entrega/        ← fotos al devolver el vehículo
│       ├── Custodia/               ← fotos de objetos del cliente
│       └── Documentos/             ← PDFs (cotizaciones, facturas) — privado
│
├── Manuales/
│   ├── Procedimientos/             ← SOPs de recepción, diagnóstico, calidad
│   ├── Formatos/                   ← plantillas de OT en papel, formatos
│   ├── Capacitación/               ← fichas técnicas, tutoriales
│   ├── Seguridad/                  ← fichas FDS/MSDS, reglamento, EPP
│   ├── Garantías/                  ← comprobantes de garantía de repuestos
│   └── Contratos/                  ← contratos con proveedores
│
├── Garantías/                      ← comprobantes a nivel taller
└── Contratos/                      ← contratos con proveedores
```

Los IDs de carpeta se cachean en la tabla `vehicle_drive_folders` para evitar re-consultas a Drive en cada upload. Si una carpeta es borrada en Drive, la app la recrea automáticamente.

### Compresión de imágenes (cliente)

Antes de enviar al servidor, el componente `DriveUploader` comprime las imágenes usando `OffscreenCanvas` (sin bloquear el hilo principal):

| Sección | Resolución máx | Calidad JPEG | Tamaño objetivo |
|---|---|---|---|
| Recepción / Entrega | 1920 × 1080 | 0.82–0.85 | < 600 KB |
| Diagnóstico / Trabajo / Repuestos / Custodia | 1280 × 960 | 0.80 | < 350 KB |

Un video > 50 MB muestra confirmación antes de subir. PDFs y documentos se suben sin compresión.

### Control de cuota

Antes de cada subida, `POST /api/drive/upload` consulta la cuota con `drive.about.get`:

| Espacio libre | Comportamiento |
|---|---|
| > 500 MB | Subida normal |
| 100–500 MB | Subida permitida + banner de advertencia en el panel |
| < 100 MB | Subida bloqueada (HTTP 507) |

### Tablas involucradas

```sql
-- Campos en tenants (cifrados / referencia)
tenants.gdrive_enabled           -- boolean
tenants.gdrive_refresh_token     -- TEXT cifrado AES-256-GCM
tenants.gdrive_root_folder_id    -- ID de la carpeta raíz en Drive
tenants.gdrive_connected_email   -- email de la cuenta conectada
tenants.gdrive_connected_at      -- timestamp de conexión
tenants.gdrive_quota_warning     -- flag de cuota baja

-- Cache de carpetas por vehículo
vehicle_drive_folders (
  tenant_id, vehicle_id,
  root_folder_id, reception_folder_id,
  custodia_folder_id, documents_folder_id,
  ot_folder_map JSONB   -- { "ot-id": { "diagnostico": "folderId", ... } }
)

-- Metadatos de archivos subidos (el archivo vive en Drive)
work_order_drive_attachment (
  tenant_id, work_order_id, vehicle_id,
  section,         -- 'recepcion'|'diagnostico'|'trabajo'|'repuestos'|
                   -- 'entrega'|'custodia'|'documentos'|'manual_*'
  drive_file_id,   -- ID del archivo en Drive
  drive_thumb_url, -- URL de miniatura pública
  original_name, mime_type, size_kb,
  uploaded_by      -- user_profile.id
)
```

### Archivos clave

| Archivo | Función |
|---|---|
| `lib/crypto.ts` | Cifrado AES-256-GCM del refresh token |
| `lib/google-drive.ts` | Cliente Drive: tokens, cuota, carpetas, upload |
| `app/api/auth/google/route.ts` | Inicia flujo OAuth |
| `app/api/auth/google/callback/route.ts` | Recibe código, guarda token, crea carpeta raíz |
| `app/api/drive/upload/route.ts` | Endpoint de subida de fotos de OT |
| `app/api/drive/upload-manual/route.ts` | Endpoint de subida de manuales internos |
| `components/work-orders/DriveUploader.tsx` | Componente cliente: compresión + upload |
| `components/work-orders/OTGallery.tsx` | Galería de fotos por sección en la OT |
| `app/(dashboard)/settings/integrations/page.tsx` | Panel de configuración de Drive |
| `app/(dashboard)/settings/integrations/manuals/` | Gestión de manuales internos |

---

## Estados de la orden de trabajo

```
draft → received → in_diagnosis → quotation_sent → awaiting_authorization
→ authorized → in_execution → [blocked_parts | blocked_technician | blocked_customer]
→ quality_control → ready_for_delivery → delivered_with_balance → closed

También: cancelled (desde cualquier estado), warranty (post-cierre)
```

Transiciones, etiquetas y colores en `lib/work-order-utils.ts`.

---

## Portal del propietario

Los clientes acceden vía **magic link** (sin contraseña) a `/portal`. Ven sus vehículos, el estado de sus OTs en tiempo real (polling ISR cada 30 s) y pueden aprobar/rechazar cotizaciones desde un enlace público `/q/[id]`.

---

## Multi-tenant

Cada taller es un `tenant`. El aislamiento de datos se enforza con **Row Level Security** en Supabase. El `createClient()` del servidor opera con el JWT del usuario (RLS activo). El `createAdminClient()` usa la service role key y **bypasea RLS** — solo para operaciones cross-tenant como búsqueda de clientes por email o configuración de Drive.
