# BASE DE DATOS

Todo lo relacionado con la base de datos de FoodFlow: cómo está montada, a
dónde van los datos que deja un visitante, cómo verla, y el procedimiento para
dejarla lista y protegida en producción.

Complementa a `SEGURIDAD.md` (endurecimiento general) y a `prisma/schema.prisma`
(el esquema real, siempre la fuente de verdad).

---

## 1. Arquitectura

| Pieza | Implementación |
| ----- | -------------- |
| Motor | **PostgreSQL** gestionado en **Neon** (base `neondb`, región `us-west-2`) |
| Cliente | **Prisma** (`@prisma/client`), un solo rol Postgres: `neondb_owner` |
| Instancia del cliente | `lib/db/prisma.ts` — singleton, reutilizado en dev para no agotar conexiones |
| Migraciones | `prisma/migrations/` — 12 hasta hoy, versionadas en git |
| Escrituras de la app | **Server Actions** de Next (`lib/actions/*.ts`). No hay `app/api/` |
| Aislamiento entre restaurantes | En la capa de app: cada action filtra por `restaurantId` (ver `SEGURIDAD.md` §F2) |

### Las dos cadenas de conexión

Neon expone dos endpoints y el proyecto usa los dos (`prisma/schema.prisma`):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // pooled (PgBouncer) — la app en runtime
  directUrl = env("DATABASE_URL_UNPOOLED")  // directa — solo 'prisma migrate'
}
```

- **`DATABASE_URL`** → termina en `-pooler.<region>.aws.neon.tech`. Es la que
  usa la app en cada request. El pooler (PgBouncer) aguanta muchas conexiones
  cortas de funciones serverless.
- **`DATABASE_URL_UNPOOLED`** → el mismo host **sin** `-pooler`. Solo la usan
  las migraciones, porque PgBouncer no soporta los *advisory locks* que
  `prisma migrate` necesita.

Ambas llevan la contraseña del rol en texto plano → **son secretos** (ver §5).

---

## 2. A dónde van los datos cuando alguien deja sus datos

Hay **dos formularios distintos** en la landing y cada uno escribe en **una
tabla distinta**. Es importante no confundirlos.

### A) Formulario de contacto completo → tabla `leads` (modelo `Lead`)

Es el formulario con **nombre + restaurante + WhatsApp + email**. El mismo
componente se usa inline en una sección, dentro del modal y en el pop-up de
salida.

```
components/lead/LeadForm.jsx
   │  (Server Action)
   ▼
lib/actions/leadCapture.ts → submitLeadCapture()
   │  · valida con Zod
   │  · honeypot "website" (si viene lleno = bot, responde ok y no guarda)
   │  · rate-limit: 3 leads por IP por hora
   │  · calcula score 0–100 desde la pérdida anual
   ▼
tabla  "leads"  en Neon
```

Columnas (`Lead` en `prisma/schema.prisma`):

| Columna | Qué guarda |
| ------- | ---------- |
| `nombre`, `restaurante` | lo que escribió el visitante |
| `whatsapp` | 9 dígitos, sin `+51` (se normaliza en `lib/leads/validation.js`) |
| `email` | opcional |
| `source` | `web_form` · `calculadora` · `whatsapp` (de dónde salió) |
| `perdida_mensual`, `perdida_anual` | soles enteros, solo si vino de la calculadora |
| `score` | 0–100, derivado de `perdida_anual` (un lead sin cifra = 0) |
| `status` | pipeline: `nuevo → contactado → cita → cliente → archivado` |
| `ip_hash` | SHA-256 salado de la IP (nunca la IP). Solo para el rate-limit |
| `created_at` | fecha de alta |

### B) Chat "prefiero que me escriban" → tabla `ClientLead` (modelo `ClientLead`)

Es el atajo del widget de chat donde el visitante solo deja un **email**.

```
components/chat/ChatWidget.jsx → lib/actions/leads.ts → submitLead() → tabla "ClientLead"
```

Columnas: `email`, `source` (`"landing"`), `status` (`new → contacted →
converted`), `ipHash`, `createdAt`. Nada más — no hay nombre ni teléfono.

### Dónde se ven dentro del panel

| Tabla | Página del dashboard | Nav |
| ----- | ------------------- | --- |
| `leads` (formulario) | `/dashboard/admin/contactos` | **Contactos** |
| `ClientLead` (chat) | `/dashboard/admin/leads` | **Leads** |

En **Contactos** cada fila trae el WhatsApp como enlace `wa.me/51…` y botones
para mover el pipeline (nuevo → contactado → cita → cliente, y archivar). Cada
cambio de estado queda en `AuditLog` (`action: "lead.status_change"`).

El **Overview** del admin muestra un contador y las 5 más recientes de cada
tabla.

> Nota: `Analytics` (`/dashboard/admin/analytics`) todavía grafica solo
> `ClientLead`. Unificarlo al embudo de `leads` es una mejora pendiente.

---

## 3. Ver la base de datos

### Prisma Studio (local, navegador de datos)

```bash
npm run db:studio
```

Abre `http://localhost:5555` con todas las tablas: filtros, orden y edición de
filas a mano. Es la forma más directa de inspeccionar o corregir datos.

### Neon Console (en la nube)

`console.neon.tech` → proyecto de FoodFlow:

- **Tables** — ver y filtrar datos sin SQL.
- **SQL Editor** — consultas ad-hoc (`SELECT * FROM leads ORDER BY created_at DESC;`).
- **Monitoring** — conexiones activas, uso de CPU/almacenamiento.
- **Branches** — ramas de base de datos (ver §5).
- **Settings → Storage** — retención de *history* / Point-in-Time Recovery.

### Estado del esquema vs. la base

```bash
npx prisma migrate status
```

Debe decir *"Database schema is up to date!"*. Si no, faltan aplicar
migraciones (`npx prisma migrate deploy`).

---

## 4. Trabajar con el esquema

| Necesito… | Comando |
| --------- | ------- |
| Cambiar el esquema en dev (crea migración + aplica) | `npm run db:migrate` → `prisma migrate dev` |
| Aplicar migraciones ya creadas (prod / CI) | `npx prisma migrate deploy` (lo corre `npm run build`) |
| Regenerar el cliente tipado tras editar el esquema | `npx prisma generate` (lo corre `postinstall`) |
| Ver diferencias esquema ↔ base | `npx prisma migrate status` |

Regla: **nunca** editar la base a mano en producción para cambios de
estructura. Siempre una migración, versionada en git, aplicada en el deploy.

---

## 5. Dejar la base lista y protegida (pendiente, fuera del código)

Estos pasos los ejecuta Adonis. No manejo credenciales.

### 5.1 Rotar los secretos expuestos

El `.env` local tiene credenciales en texto plano y han pasado por sesiones de
trabajo. Como todavía no hay clientes ni datos reales, rotar ahora es gratis.

1. **Contraseña de Neon** — Neon Console → tu proyecto → *Branches* → `main` →
   *Roles* → `neondb_owner` → **Reset password**. Copiar la cadena nueva y
   actualizar `DATABASE_URL` **y** `DATABASE_URL_UNPOOLED` en:
   - `.env` local,
   - Vercel → Settings → Environment Variables (Production **y** Preview).
   Redeploy. La cadena vieja deja de funcionar al instante.

2. **`AUTH_SECRET`** — generar uno nuevo:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Reemplazar en `.env` y en Vercel (mejor un valor **distinto** por entorno).
   Redeploy → se cierran todas las sesiones y se invalidan los OTP pendientes.

3. **`SMTP_PASS`** (`info@foodflow.site`, Hostinger) — cambiar la contraseña de
   ese buzón en el panel de Hostinger y reflejarla en `.env` y en Vercel.

### 5.2 Separar Production y Preview (Neon Branches + Vercel)

Hoy `.env` local, Preview y Production podrían apuntar a la **misma** base. No
deben. Un deploy de Preview con un bug no puede tocar los datos reales.

1. Neon Console → *Branches* → **Create branch** desde `main`. Nómbrala
   `preview`. Neon te da su propia cadena de conexión (pooled + unpooled).
2. Vercel → Settings → Environment Variables. Para cada variable, marcar el
   entorno correcto:

   | Variable | Production | Preview | Development |
   | -------- | :--------: | :-----: | :---------: |
   | `DATABASE_URL` | rama `main` | rama `preview` | local |
   | `DATABASE_URL_UNPOOLED` | rama `main` | rama `preview` | local |
   | `AUTH_SECRET` | valor A | valor B (distinto) | local |
   | `ADMIN_EMAILS` | ✔ | ✔ | ✔ |
   | `SMTP_*` | ✔ | ✔ (o vacío para no enviar correos en Preview) | opcional |
   | `NEXT_PUBLIC_SITE_URL` | `https://foodflow.site` | URL de preview de Vercel | `http://localhost:3000` |

3. Redeploy Production y abrir una PR para probar que Preview usa su rama.

### 5.3 Backups — Point-in-Time Recovery

Neon Console → *Settings* → *Storage* (o *Branches* → *History retention*).
Confirmar que **history retention / PITR** está activo. En el plan gratis suele
ser 24 h; para el piloto conviene subirlo a **7 días** (permite restaurar la
base a cualquier instante de esa ventana si algo se corrompe o se borra).

### 5.4 Escaneo de secretos en CI

Añadir un workflow de GitHub Actions con `gitleaks/gitleaks-action` para que un
secreto nunca llegue a un commit. (Detalle en `SEGURIDAD.md` → "Pendiente por
Adonis" #3.)

### 5.5 (Opcional) RLS a nivel Postgres

Row-Level Security en Neon es la fase F6 de `SEGURIDAD.md`, sin decidir. El
aislamiento entre restaurantes ya está resuelto en la capa de aplicación; RLS
sería una segunda red por si una consulta olvidara el filtro `restaurantId`.
No es requisito para el piloto.

---

## 6. Checklist rápido

- [ ] `npx prisma migrate status` → "up to date"
- [ ] Contraseña de Neon rotada, reflejada en `.env` y Vercel
- [ ] `AUTH_SECRET` rotado (valor distinto Production / Preview)
- [ ] `SMTP_PASS` rotado
- [ ] Rama `preview` de Neon creada
- [ ] Env vars de Vercel definidas por entorno (tabla §5.2)
- [ ] PITR / history retention de Neon confirmado (≥ 7 días)
- [ ] `gitleaks` en CI
