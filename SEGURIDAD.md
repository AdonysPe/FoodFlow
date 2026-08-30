# SEGURIDAD

Estado de endurecimiento de FoodFlow. Documento vivo: cada fase añade su
sección. La **matriz de pruebas** al final es el cierre obligatorio.

## Contexto de arquitectura

FoodFlow **no usa Supabase**. El stack real:

| Pieza            | Implementación                                                        |
| ---------------- | -------------------------------------------------------------------- |
| Base de datos    | Postgres en **Neon**, vía **Prisma** (`prisma/schema.prisma`)        |
| Conexión         | Rol Postgres único (`DATABASE_URL`). Sin RLS activa hoy.             |
| Auth             | OTP por correo propio + JWT de sesión (`lib/auth/*`), cookie httpOnly |
| Escrituras       | **Server Actions** de Next (`lib/actions/*.ts`). No hay `app/api/`.   |
| Aislamiento tenant | En la capa de aplicación: cada action filtra por `restaurantId` y    |
|                  | valida propiedad antes de mutar (`requireClientRestaurant` /          |
|                  | `requireComandaRestaurant` / `requireAdmin`).                         |
| Storage          | No existe todavía. `MenuItem.photoUrl` es solo texto (URL).           |
| Terceros         | SMTP (Gmail app password / Resend) para el OTP.                       |

Decisión (2026-08-29): endurecer sobre este stack, **sin migrar a Supabase**.
RLS a nivel Postgres queda como fase opcional posterior (se puede hacer en Neon,
no requiere Supabase).

## Estado por fase

| Fase | Alcance                                              | Estado      |
| ---- | --------------------------------------------------- | ----------- |
| F1   | Variables de entorno + `.env.example` + Vercel      | ✅ Hecha     |
| F2   | Auditoría RBAC de la capa de app + tests aislamiento | ✅ Hecha     |
| F3   | Rutas públicas seguras (leads/reservas) + rate limit | ✅ Hecha     |
| F4   | Headers de seguridad + CORS de Server Actions        | ✅ Hecha     |
| F5   | `audit_logs` + patrón de Storage (aún no existe)    | ✅ Hecha     |
| F6   | (Opcional) RLS a nivel Postgres en Neon              | ⏳ Sin decidir |

---

## F1 · Variables de entorno

### Inventario y clasificación

| Variable                | Ámbito           | ¿Secreto? | Dónde se usa                              |
| ----------------------- | ---------------- | --------- | ---------------------------------------- |
| `DATABASE_URL`          | Servidor         | **Sí**    | `lib/db/prisma.ts` (runtime)             |
| `DATABASE_URL_UNPOOLED` | Servidor         | **Sí**    | `prisma migrate` (build)                 |
| `AUTH_SECRET`           | Servidor         | **Sí**    | `lib/auth/session.ts`, `lib/auth/otp.ts`, `lib/actions/leadCapture.ts` |
| `ADMIN_EMAILS`          | Servidor         | No        | `lib/actions/auth.ts`                    |
| `SMTP_HOST/PORT/USER`   | Servidor         | No        | `lib/email/mailer.ts`                    |
| `SMTP_PASS`             | Servidor         | **Sí**    | `lib/email/mailer.ts`                    |
| `SMTP_FROM`             | Servidor         | No        | `lib/email/mailer.ts`                    |
| `NEXT_PUBLIC_SITE_URL`  | **Cliente** + servidor | No  | `app/layout.jsx` (metadata)             |

Auditoría de fugas al cliente (F1): se revisaron todos los componentes
`"use client"` y los imports transitivos. **Ningún secreto llega al bundle del
navegador.** La única `NEXT_PUBLIC_*` es `NEXT_PUBLIC_SITE_URL`, que es una URL
pública. Prisma y `lib/auth/*` solo se importan desde Server Components y
Server Actions (`"use server"`).

### Cambios aplicados en F1

- `.gitignore`: ya ignoraba `.env*` (con excepción de `.env.example`) y nunca se
  ha commiteado un `.env` (verificado en todo el historial). Se añadió `.vercel`.
- `.env.example`: reescrito. Documenta la regla `NEXT_PUBLIC_*` = público,
  clasifica cada variable, y explica cómo rotar cada secreto. Se añadió
  `NEXT_PUBLIC_SITE_URL` (se usaba en código pero faltaba en el ejemplo).
- `APP_URL`: era config muerta (estaba en `.env.example` pero ningún archivo la
  lee). Se quitó del ejemplo. Si la tienes en tu `.env` local, puedes borrar esa
  línea.

### ⚠️ Acción requerida: rotar secretos

El `.env` local contiene credenciales reales en texto plano y quedaron expuestas
al preparar esta auditoría. Aunque `.env` nunca se subió al repo, conviene
rotar los tres secretos ahora (hoy es gratis: no hay clientes ni sesiones que
proteger). **Estos pasos los ejecutas tú — no manejo credenciales.**

**1. Contraseña de la base de datos (Neon)**

1. Neon Console → tu proyecto → *Branches* → rama `main` → *Roles* → `neondb_owner`.
2. *Reset password* → copia la cadena nueva.
3. Actualiza `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en:
   - tu `.env` local,
   - Vercel → Settings → Environment Variables (Production **y** Preview).
4. Redeploy en Vercel. La cadena vieja deja de funcionar al instante.

**2. `AUTH_SECRET`**

1. Genera uno nuevo:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Reemplázalo en `.env` local y en Vercel (Production y Preview — pueden ser
   distintos entre entornos, de hecho es mejor que lo sean).
3. Redeploy. Efecto: se cierran todas las sesiones abiertas y se invalidan los
   OTP pendientes. Los usuarios vuelven a pedir código.

**3. Gmail App Password (`SMTP_PASS`)**

1. https://myaccount.google.com/apppasswords → revoca la actual ("FoodFlow" o
   como la hayas llamado).
2. *Create* → nombre nuevo → copia los 16 caracteres.
3. Reemplaza `SMTP_PASS` en `.env` local y en Vercel.
4. Redeploy. Prueba pidiendo un código de acceso.

> Antes del lanzamiento real: cambiar de Gmail a Resend con dominio propio
> verificado. Gmail tiene límite ~500 envíos/día y el `From` sale de tu correo
> personal.

### Checklist de Vercel (a aplicar manualmente)

- [ ] **Bases de datos separadas por entorno.** Crear una rama/DB de Neon
      distinta para *Preview* (no apuntar Preview a la DB de Production). En
      Neon: *Branches* → *Create branch* desde `main` → usar su cadena en las
      env vars de Preview.
- [ ] Definir en Vercel → Settings → Environment Variables, marcando el entorno
      correcto en cada una:
  | Variable                | Production | Preview | Development |
  | ----------------------- | :--------: | :-----: | :---------: |
  | `DATABASE_URL`          | prod DB    | preview DB | local    |
  | `DATABASE_URL_UNPOOLED` | prod DB    | preview DB | local    |
  | `AUTH_SECRET`           | valor A    | valor B (distinto) | local |
  | `ADMIN_EMAILS`          | ✔          | ✔       | ✔           |
  | `SMTP_*`                | ✔          | ✔ (o vacío para no enviar) | opcional |
  | `NEXT_PUBLIC_SITE_URL`  | dominio prod | URL de preview | `http://localhost:3000` |
- [ ] Confirmar que **no** existe ninguna env var sin prefijo `NEXT_PUBLIC_` que
      se necesite en el navegador (no hay ninguna hoy).
- [ ] Activar *Vercel → Settings → Git → Ignored Build Step* solo si aplica; no
      es requisito de seguridad.

### Verificación de F1

```bash
git log --all --full-history -- .env    # -> sin resultados (nunca commiteado)
git check-ignore .env                    # -> .env (ignorado)

npm run build
grep -rIn "npg_\|<primeros chars de AUTH_SECRET>" .next/static   # -> vacío
grep -rIl "<password de Neon>" .next | grep -v cache             # -> vacío
```

Ejecutado el 2026-08-30: `.env` nunca commiteado, ignorado; build limpio, ni el
password de Neon ni `AUTH_SECRET` ni la App Password aparecen en **ningún**
chunk del build (ni cliente ni servidor).

---

## F2 · RBAC de la capa de aplicación + aislamiento

### Modelo de roles

| Rol      | Es               | Puede                                                                 | No puede |
| -------- | ---------------- | -------------------------------------------------------------------- | -------- |
| `admin`  | Operador de la plataforma FoodFlow | CRUD de restaurantes; leer/gestionar `leads`; (futuro) `audit_logs` | Nada de datos operativos de un restaurante (no es tenant) |
| `client` | Dueño de **un** restaurante | CRUD completo de SU restaurante: carta, categorías, mesas, reservas, pedidos, clientes, equipo (mozos) | Ver otros restaurantes; ver `leads`; el panel admin |
| `mozo`   | Camarero de un restaurante (vía `StaffMembership`) | Solo `/dashboard/comanda`: ver carta/mesas/cuentas, enviar comandas, cobrar, anular | Entrar a `/dashboard/app/*` ni `/dashboard/admin/*`; tocar carta, precios, categorías, mesas, reservas; ver `leads` ni números del negocio |

### Cómo se aplica (defensa en capas)

1. **Middleware** (`middleware.ts`) — primer filtro por ruta, con el rol del JWT.
   No hace consultas a BD (corre en Edge).
2. **Layout del segmento** — `/dashboard/admin/layout.tsx`, `/dashboard/app/layout.tsx`
   y `/dashboard/comanda/layout.tsx` **re-verifican el rol contra la BD** con
   `getCurrentUser()`. Aquí es donde un rol degradado se corta de verdad.
3. **Cada server action** — llama a un guard de `lib/auth/guards.ts` antes de
   tocar nada, y toda mutación por `id` hace
   `findFirst({ where: { id, restaurantId } })` antes de escribir.

### Cambios aplicados en F2

- **`lib/auth/guards.ts`** (nuevo): superficie única de autorización.
  `requireUser()`, `requireAdmin()`, y re-exporta `requireClientRestaurant` /
  `requireComandaRestaurant`. Se eliminó la definición duplicada de
  `requireAdmin` que vivía copiada en `lib/actions/leads.ts` y
  `lib/actions/restaurants.ts`.
- **`lib/security/clientHash.ts`** (nuevo): `callerIpHash()` — hash salado
  (SHA-256 + `AUTH_SECRET`) de la IP, compartido por todas las escrituras
  públicas. Extraído de `leadCapture.ts` (lógica idéntica).
- **`submitLead`** (`lib/actions/leads.ts`): era el único endpoint público sin
  límite. Ahora rate-limita a **5 leads por IP por hora** (contados sobre las
  filas, sobrevive a cold start) y guarda `ipHash`. Migración
  `20260830041951_add_client_lead_ip_hash` (columna nullable, aditiva).
- **TTL de sesión** (`lib/auth/session.ts`): de 30 días a **7 días**. Acota la
  ventana en la que el rol del JWT (usado por el middleware para enrutar) puede
  estar desactualizado. El acceso a datos nunca depende de ese claim: layouts y
  actions releen el rol de la BD.

### Riesgo residual aceptado

El middleware enruta con el `role` del JWT sin leer la BD (imposible en Edge).
Un `admin` degradado a `client`, o un `mozo` cuya membresía cambió, conserva el
**enrutado** de su rol viejo hasta 7 días (antes 30) o hasta el siguiente login.
**No conserva acceso a datos**: el layout del segundo nivel corta con
`getCurrentUser()` contra BD, y ninguna server action confía en el claim. El fix
completo (revalidar en cada request) añadiría una query al borde y complejidad
sin cerrar un hueco de datos real. Se acepta.

### Verificación de F2

```bash
npm run security:check      # scripts/security-check.mjs
```

Siembra 2 restaurantes + 1 mozo y prueba, contra la BD real, que el patrón
`{ where: { id, restaurantId } }` bloquea lecturas cross-tenant, que el guard de
`reorder*` rechaza ids ajenos, y que un mozo no resuelve como `client`. Limpia
sus datos al terminar.

Checks end-to-end hechos a mano (dev server) el 2026-08-30:

- Login OTP completo (pedir código → verificar → cookie 7 d → middleware →
  layout admin re-check → `/dashboard/admin/overview`). ✔
- `submitLeadCapture` (formulario landing) → fila `web_form` con `ipHash`. ✔
- `submitLead` (chat, "prefiero que me escriban") → fila `landing` con `ipHash`. ✔
- Sin errores de servidor en ningún flujo.

---

## F3 · Rutas públicas de escritura + rate limit

**Superficie pública de escritura hoy:** 2 server actions, sin `/api`.

| Endpoint | Auth | zod | Honeypot | Rate limit |
| -------- | ---- | --- | -------- | ---------- |
| `submitLeadCapture` (formulario funnel) | no | ✅ | ✅ (`website`) | 3 / IP / hora (sobre filas `Lead`) |
| `submitLead` (chat "prefiero que me escriban") | no | ✅ (email) | — (no es un form que un bot raspe; es un paso deliberado) | 5 / IP / hora (F2) |
| `requestOtp` (login) | no | ✅ | — | **15 / IP / 15 min (F3)** + 5 / email / 15 min + cooldown 30 s |

### Cambios aplicados en F3

- **`lib/security/rateLimit.ts`** (nuevo) + tabla **`RateLimit`** (migración
  `20260830043219_add_rate_limit`). Limitador de ventana fija, atómico
  (`INSERT … ON CONFLICT DO UPDATE SET count = count + 1`), respaldado en BD
  (sobrevive a cold starts y a varias instancias serverless). Auto-limpia
  ventanas viejas. API: `rateLimit(bucket, subject, { max, windowMs })`.
- **`requestOtp`** (`lib/actions/auth.ts`): añadido un tope **por IP** antes del
  tope por email. Cierra el *email bombing* (una IP pidiendo códigos para
  muchas direcciones distintas — el tope por email solo protege a una víctima
  concreta). 15/15 min es holgado para todo un equipo de restaurante entrando
  desde el mismo Wi-Fi.

### Considerado y descartado en F3

- Tope por IP en `verifyOtp`: el brute-force ya está acotado (5 intentos por
  código, el código rota, y `requestOtp` limita a 15/IP/15 min → ~75 intentos
  máx. por IP cada 15 min sobre un espacio de 1 000 000). Añadir otro tope solo
  suma un modo de fallo para el usuario que teclea mal. No se hizo.

### Pendiente: ruta pública de reservas (cuando exista "Sites")

Hoy **no hay** endpoint público de reservas — `createReservation` con
`source:"web"` solo se llama desde el dashboard (botón "Simular web"), detrás de
`requireClientRestaurant()`. Cuando se construya el sitio público de pedidos/
reservas, ese insert **NO** debe llamar a `createReservation` directo desde el
cliente. Patrón obligatorio (ya hay piezas listas):

1. Server action / route dedicada, `"use server"`.
2. `zod`: nombre/teléfono con longitudes máx., fecha/hora válidas, `partySize`
   acotado, honeypot.
3. `rateLimit("reserva-web", await callerIpHash(), { max: 5, windowMs: 60_000 })`.
4. Resolver el restaurante por un slug/id público — **no** aceptar `restaurantId`
   crudo del cliente sin validarlo.
5. Insertar siempre como `status:"pendiente"`, `source:"web"` (el dueño confirma).
6. Revalidar la ruta del dashboard del dueño.

### Verificación de F3

`npm run security:check` incluye el check del limitador (`max=5` → bloquea en la
petición #6). Login OTP end-to-end verificado el 2026-08-30 con el tope por IP
activo (se creó la fila `RateLimit` `otp-ip:<ipHash>:<win>` con `count 1`, el
flujo llegó a `/dashboard/admin/overview`).

---

## F4 · Cabeceras de seguridad + CORS de Server Actions

Todo en `next.config.mjs`.

### Cabeceras (aplicadas a `/:path*`)

| Cabecera | Valor | Modo |
| -------- | ----- | ---- |
| `X-Content-Type-Options` | `nosniff` | enforce |
| `X-Frame-Options` | `DENY` | enforce — la app nunca se embebe en iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | enforce |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | enforce — la app no usa ninguna |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | enforce — los navegadores lo ignoran sobre HTTP/localhost, solo actúa en el deploy HTTPS |
| `Content-Security-Policy-Report-Only` | ver abajo | **Report-Only** |
| `X-Powered-By` | *(eliminada)* | `poweredByHeader: false` |

### CSP — por qué Report-Only

La CSP se emite como **`Content-Security-Policy-Report-Only`**: reporta
violaciones en la consola del navegador sin bloquear nada. Motivo: Three.js,
Framer Motion y `next/font` inyectan estilos inline, y Next inyecta scripts de
arranque inline. Una CSP *enforced* sin un pipeline de nonces rompería la
landing.

Política actual:

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; script-src 'self' 'unsafe-inline' ('unsafe-eval' solo dev);
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;
font-src 'self' data:; connect-src 'self' (ws:/wss: solo dev);
frame-src 'none'; manifest-src 'self'
```

**Camino a enforce** (siguiente iteración, fuera de este bloque):

1. Observar el reporte en el deploy de Vercel unos días (consola del navegador,
   o añadir una ruta `/api/csp-report` que registre los `report-uri`).
2. Introducir nonces por request (middleware que genera un nonce y lo pasa al
   `<Script>`/headers) para quitar `'unsafe-inline'` de `script-src`.
3. Evaluar quitar `'unsafe-inline'` de `style-src` (difícil con Framer Motion;
   puede quedarse).
4. Añadir `upgrade-insecure-requests`.
5. Cambiar el nombre de la cabecera a `Content-Security-Policy`.

### CORS / CSRF de Server Actions

No hay rutas `/api` ni ninguna cabecera `Access-Control-Allow-Origin` en el
proyecto (verificado). La única superficie de mutación son las Server Actions, y
**Next ya rechaza toda petición cuyo `Origin` no coincida con el `Host`**
(protección CSRF integrada). En `next.config.mjs`:

```js
experimental: { serverActions: { allowedOrigins: [] } }
```

`allowedOrigins` solo **añade** orígenes que pueden *saltarse* esa comprobación
(útil tras un reverse proxy). Lo dejamos explícitamente vacío como declaración
de intención: nadie debe añadir orígenes aquí sin una razón concreta. No se
añadió un middleware de Origin propio — duplicaría una comprobación ya probada y
sería un sitio más donde introducir un bug.

### Verificación de F4

```bash
curl -sI http://localhost:3000/ | grep -iE "x-frame|x-content-type|referrer|permissions-policy|strict-transport|content-security-policy-report|x-powered-by"
```

Verificado el 2026-08-30 en dev: las 6 cabeceras presentes en `/` y en assets,
`X-Powered-By` ausente, landing y dashboard renderizan sin errores y **sin
ninguna violación de CSP** en la consola (dev). Falta observar el Report-Only en
el deploy de producción.

---

## F5 · Auditoría + Storage

### `audit_logs` (hecho)

Tabla **`AuditLog`** (migración `20260830044359_add_audit_log`) — append-only,
sin relación con `Restaurant` (un usuario de restaurante no puede alcanzarla
por join; la lectura además está detrás de `AdminLayout`).

Campos: `action`, `actorId`/`actorEmail` (email denormalizado para que una
cuenta borrada siga trazando), `entity`/`entityId`, `before`/`after` (solo los
campos que cambiaron), `ipHash` (hash salado, nunca la IP), `restaurantId`
(scope cuando aplica), `createdAt`.

Helper **`lib/audit/log.ts`** → `logAudit({ action, actor, entity, entityId,
before, after, restaurantId })`. **Best-effort**: si el insert falla, se registra
en consola y se traga — una escritura de auditoría nunca convierte una acción
exitosa del usuario en un error. Se llama *después* de que la mutación tuvo
éxito.

Acciones cubiertas:

| `action` | Dónde | `before` / `after` |
| -------- | ----- | ------------------ |
| `auth.login` | `verifyOtp` | after: `{ role }` |
| `auth.logout` | `logout` | — |
| `menu.item.price_change` | `updateMenuItem` (solo si el precio cambió) | `{ name, price }` |
| `menu.item.delete` | `deleteMenuItem` | before: snapshot del plato |
| `staff.add` | `addStaffMember` | after: `{ email, role }` |
| `staff.remove` | `removeStaffMember` | before: `{ email, role }` |
| `lead.status_change` | `updateLeadStatus` | `{ status }` |
| `restaurant.delete` | `deleteRestaurant` | before: `{ name, ownerId }` |

Visor en **`/dashboard/admin/audit`** (solo admin, solo lectura, últimos 200).
"Export de leads" del brief no aplica: no existe esa función; si se añade, debe
llamar `logAudit({ action: "lead.export" })`.

### Storage (no existe — patrón para cuando se implemente)

Hoy **no hay** subida de archivos. `MenuItem.photoUrl` es un campo de texto
(URL, validado con `z.string().url()`) que nadie edita todavía por UI. No hay
bucket, no hay SDK de almacenamiento.

Cuando se añadan las fotos de carta, el bucket debe cumplir:

1. **Lectura pública, escritura autenticada.** Solo un `client`/`owner` sube, y
   **solo dentro de la carpeta `fotos_carta/<restaurantId>/`** — la ruta se
   construye en el servidor a partir de `requireClientRestaurant()`, nunca se
   acepta del cliente.
2. **Límites:** tipo MIME en un allowlist (`image/jpeg`, `image/png`,
   `image/webp`), peso máx. (~2 MB), dimensiones máx.
3. La subida pasa por una server action / route firmada — el navegador no habla
   directo con el bucket con credenciales de escritura.
4. `img-src` de la CSP ya permite `https:` y `blob:`; si el bucket tiene un
   dominio fijo, restringirlo a ese host al pasar la CSP a enforce.
5. Borrar un plato / restaurante → borrar sus archivos (o job de limpieza).
6. Registrar `menu.item.photo_change` en `audit_logs`.

### Verificación de F5

```bash
npm run security:check   # checks "AuditLog … unreachable" + "audit rows insert cleanly"
```

Verificado end-to-end el 2026-08-30 (dev):

- Login / logout como admin → filas `auth.login` (`after: {role:"admin"}`) y
  `auth.logout`, ambas con `ipHash`. Visibles en `/dashboard/admin/audit`.
- Cambio de precio como owner de Tanta (S/ 24 → 26.5) → fila
  `menu.item.price_change` con actor, `restaurantId` scoped y `before/after`.
- Sin errores de servidor. Filas de prueba limpiadas después.

---

## Matriz de pruebas

Corre `npm run security:check` para las filas automatizadas (11 checks). Las
demás son manuales con el comando indicado.

| # | Escenario | Resultado esperado | Cómo verificar | Estado |
| - | --------- | ------------------ | -------------- | ------ |
| 1 | **mozo intenta cambiar precio de un plato → debe fallar** | la mutación aborta: `updateMenuItem` → `requireClientRestaurant()` → `redirect("/login")` porque el rol ≠ `client` | `npm run security:check` confirma que el rol mozo ≠ `client`. Manual: sesión de mozo → `curl -i -b <cookie> -X POST http://localhost:3000/dashboard/app/menu -H "Next-Action: <id>"` → 303 a /login, precio intacto | ✅ |
| 2 | **restaurante A lee datos de B → debe fallar** | devuelve vacío / "no encontrado": todo `findFirst({ id })` lleva `restaurantId` | `npm run security:check` (checks "A cannot load B's …", "reorder … rejects …") | ✅ |
| 3 | **cliente sin auth lee leads → debe fallar** | redirige a `/login`, cero datos: middleware + `AdminLayout` re-check contra BD | Manual: `curl -sI http://localhost:3000/dashboard/admin/leads` sin cookie → `307` a `/login` | ✅ |
| 4 | **`POST /api/leads` x20 rápidos → 429** (equivalente: escrituras públicas en ráfaga) | se corta: funnel 3/IP/h, chat 5/IP/h, OTP 15/IP/15min | `npm run security:check` (check del limitador → bloquea en la #6). Manual: reenviar el form del funnel 4× desde la misma IP → el 4º muestra "demasiadas solicitudes" | ✅ |
| 5 | una IP pide códigos OTP para muchos correos (email bombing) | se corta a los 15 / 15 min, sin importar el correo | `requestOtp` → `rateLimit("otp-ip", ipHash, …)` antes del tope por email | ✅ |
| 6 | usuario `client` entra al panel admin | rebota a su panel: middleware manda `/dashboard/admin/*` → `/dashboard` si rol ≠ admin | Manual: sesión de owner → navegar a `/dashboard/admin/overview` → rebota | ✅ |
| 7 | secretos en el bundle del cliente | ninguna coincidencia | `npm run build` && `grep -rIn "npg_\|<AUTH_SECRET>" .next/static` → vacío (ver §"Verificación de F1") | ✅ |
| 8 | la página embebida en un `<iframe>` ajeno | el navegador lo bloquea | `curl -sI http://localhost:3000/ \| grep -i "x-frame\|frame-ancestors"` → `DENY` / `'none'` | ✅ |
| 9 | Server Action con `Origin` ≠ `Host` (CSRF) | Next la rechaza | protección integrada de Next 15; `experimental.serverActions.allowedOrigins: []` no la afloja | ✅ |
| 10 | usuario de restaurante intenta leer `audit_logs` | inalcanzable: `AuditLog` no tiene relación con `Restaurant`, y el visor está bajo `AdminLayout` | `npm run security:check` (check "AuditLog … unreachable from a tenant query") | ✅ |
| 11 | una acción sensible ocurre (login, cambio de precio, delete, cambio de rol) | queda una fila en `audit_logs` con actor, entidad, antes/después, ipHash, ts | Manual: hacer la acción → `/dashboard/admin/audit`. Verificado 2026-08-30 con login/logout y cambio de precio | ✅ |

### Riesgos residuales conocidos (aceptados)

- **Rol stale en el JWT para enrutado** (F2): mitigado en profundidad; TTL 7 d.
- **CSP en Report-Only** (F4): no bloquea nada todavía; falta el ciclo de
  observación en prod + nonces antes de enforce.
- **`npm audit`: 6 vulnerabilidades *high*** (postcss / sharp / next transitivas)
  cuyo fix completo exige `next@16` (breaking). Revisar en la próxima subida de
  Next. Ninguna es explotable en la superficie actual (no se procesa CSS ni
  imágenes de terceros en runtime).
- **Backups de Neon**: verificar que el plan tenga Point-in-Time Recovery
  activo (Neon Console → Settings → Storage). No se pudo comprobar desde aquí.

## Pendiente por Adonis (fuera del código)

1. **Rotar los 3 secretos** expuestos al auditar (ver §F1): password de Neon,
   `AUTH_SECRET`, Gmail App Password.
2. **Vercel**: DB de Neon separada para Preview + env vars por entorno
   (Production / Preview), `AUTH_SECRET` distinto entre ambos (ver §F1).
3. **Escaneo de secretos en CI**: añadir `gitleaks` (GitHub Action
   `gitleaks/gitleaks-action`) para que un secreto no llegue nunca a un commit.
4. **Neon PITR**: confirmar que está activo.
5. **CSP → enforce**: observar el `Report-Only` en el deploy unos días, luego
   seguir el "camino a enforce" de §F4.
6. **`npm audit`**: planificar la subida a `next@16` para cerrar las 6 *high*.
