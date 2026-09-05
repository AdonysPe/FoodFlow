# API de facturación electrónica

Backend de la autogestión: cada restaurante configura **su propia** cuenta con
un OSE, sube **su** certificado y emite con **su** RUC. FoodFlow guarda la
configuración, orquesta la emisión y archiva el resultado; no revende
facturación ni cobra por comprobante.

---

## 1. Dónde vive cada cosa

| Concepto | Tabla | Por qué ahí |
|---|---|---|
| Datos del contribuyente, series, correlativos, proveedor | `ReceiptSettings` | Lo lee el ticket, la caja y la pantalla de configuración |
| Certificado .pfx, su contraseña, token del OSE | `BillingCredentials` | Cifrado AES-256-GCM. Tabla aparte para que ningún `include` de la configuración lo arrastre |
| El comprobante enviado y la respuesta de SUNAT | `cdrs` | Registro tributario (5 años). No es un campo del pedido |
| Lo que se imprimió y se entregó | `Order` | `sunatStatus`, `docSeries`, `docNumber`, `sunatHash` |

> El brief pedía una tabla `billing_config`. Esos campos ya existían repartidos
> en las dos primeras tablas, sobre datos en producción; renombrarlas habría
> sido una migración destructiva a cambio de nada. La equivalencia campo a campo
> está al final de este documento.

### La tabla `cdrs`

Una fila **se abre en `PENDIENTE` en el mismo momento en que se saca el
correlativo**, antes de hablar con el OSE. Así ningún número queda gastado sin
constancia de en qué se gastó.

Estados y qué significan:

- **`PENDIENTE`** — el número está reservado y el envío no se ha resuelto. Se
  reintenta con *ese mismo* número.
- **`ACEPTADO`** — SUNAT lo tomó. Es el único estado que permite que el ticket
  se llame boleta o factura electrónica.
- **`RECHAZADO`** — SUNAT lo rechazó. **Terminal**: el correlativo está gastado y
  lo que corresponde es emitir un documento nuevo, no reintentar este.

Restricción `UNIQUE (restaurant_id, serie, correlativo)`: dos comprobantes bajo
el mismo número es el único error que SUNAT no perdona, y esta es la última
línea de defensa contra él.

---

## 2. Endpoints

Todos devuelven el mismo sobre:

```jsonc
{ "ok": true,  "data": { … },                              "requestId": "a1b2c3d4" }
{ "ok": false, "error": { "code": "…", "message": "…" },   "requestId": "a1b2c3d4" }
```

`message` siempre en español y apto para enseñarse tal cual en pantalla.
`requestId` aparece también en la cabecera `x-request-id` y en cada línea de log
del servidor: es lo que se pide cuando alguien reporta un fallo.

| Código | HTTP | Cuándo |
|---|---|---|
| `unauthorized` | 401 | Sin sesión |
| `forbidden` | 403 | Sesión sin restaurante, o mozo intentando configurar |
| `not_found` | 404 | El recurso no existe **o es de otro local** (a propósito no se distinguen) |
| `conflict` | 409 | El pedido no está cobrado, ya fue aceptado, está anulado |
| `billing_not_configured` | 409 | Falta configuración para emitir; `details.missing` la lista |
| `validation_error` | 422 | `details` trae `[{ field, message }]` |
| `rate_limited` | 429 | Con cabecera `retry-after` |
| `ose_unavailable` | 502 | Reservado para fallos del operador |
| `internal` | 500 | Lo inesperado. El detalle se queda en el log |

### `GET /api/restaurants/:id/billing-config`

Solo el dueño. El `:id` **no elige** el restaurante — lo elige la sesión; si no
coinciden, 404. Nunca devuelve secretos: solo pistas (`••••••••3f2a`) y banderas
de "hay credencial guardada".

### `POST /api/restaurants/:id/billing-config`

Cuerpo parcial: solo se toca lo que llega.

```jsonc
{
  "ruc": "20512345678", "razonSocial": "…", "nombreComercial": "…",
  "direccion": "…", "telefono": "…", "correoNotificacion": "…",
  "oseProvider": "nubefact", "oseEndpoint": "https://api.nubefact.com/api/v1/…",
  "oseApiKey": "…", "oseApiSecret": "…",
  "serieBoleta": "B001", "serieFactura": "F001", "serieNc": "FC01",
  "correlativoBoleta": 124   // el PRÓXIMO número, no el contador
}
```

Dos reglas: **un correlativo nunca baja** (bajarlo fabrica un número repetido) y
**un secreto vacío no borra el guardado** (el formulario no conoce el valor
actual; "no mandé nada" significa "déjalo").

Cuota: 60/hora.

### `POST /api/billing/test-connection`

Cuerpo vacío → prueba lo guardado y anota el resultado en `BillingCredentials`.
Con `{ apiKey, provider, endpoint }` → prueba una credencial recién escrita
**sin guardarla** (no se persiste, no se registra, no vuelve en la respuesta).

`credentialVerified: false` significa que solo se pudo comprobar que la URL es
un host público que responde — no que el OSE aceptó el token. Con adaptador
(Nubefact) es `true` y la prueba es real.

Cuota: 20/hora, porque cada llamada golpea el servicio de un tercero.

### `POST /api/billing/emit`

```jsonc
{ "orderId": "clx…", "documentType": "boleta" }  // documentType es opcional
```

Emite el comprobante de un pedido **ya cobrado**. No cobra: cobrar es de la
comanda. Un pedido ya aceptado devuelve 409 con su CDR; uno pendiente reintenta
con el **mismo** correlativo.

Un fallo de emisión sale como **200 con el desenlace dentro**, no como 5xx: la
petición se procesó, el pedido sigue cobrado y el ticket interno se entrega
igual. Un 5xx obligaría al frontend a adivinar si se emitió o no.

Cuota: **100/hora por restaurante**. Exige `requireBillingConfig`.

### `GET /api/billing/cdrs`

`?page=1&pageSize=25&estado=ACEPTADO&tipo=03&q=B001-00000124&desde=2026-03-01&hasta=2026-03-31&resumen=1`

Sin XML — son cientos de KB por fila. `resumen=1` añade el conteo por estado del
mes en curso.

### `GET /api/billing/cdrs/:id`

Uno solo. Con `?incluirXml=1` viaja también el XML guardado.

### `POST /api/billing/send-email`

```jsonc
{ "cdrId": "clx…", "email": "otro@correo.pe" }  // email opcional
```

Reenvía PDF/XML. Solo el dueño, solo comprobantes **aceptados**, cuota 30/hora —
un endpoint que manda correo a una dirección arbitraria es, si se deja abierto,
un relay.

---

## 3. Middleware

`withApi(handler, options)` en [`lib/api/guard.ts`](lib/api/guard.ts) compone las
cuatro capas. **El orden no es decorativo:**

```
authMiddleware          ¿sesión válida?              → 401
multiTenantMiddleware   ¿de qué restaurante es?      → todo lo de abajo queda
                                                       encerrado en ese id
rateLimiter             ¿se pasó de cuota?           → 429
billingConfigValidator  ¿puede emitir siquiera?      → 409
```

El aislamiento va segundo porque el limitador cuenta **por restaurante** (un
local ruidoso no consume la cuota de otro) y el validador lee la configuración
de ese mismo local.

**La regla del inquilino:** el handler recibe `ctx.restaurantId` y no tiene forma
de mirar otro. El id sale de la sesión, nunca de la URL ni del cuerpo. Cuando la
ruta lleva un id en el path se compara contra el de la sesión y, si no coinciden,
la respuesta es **404 y no 403** — un 403 confirmaría que ese restaurante existe.

El middleware de sesión **relee el usuario de la base** en vez de creerle al rol
del JWT: un rol revocado hace diez minutos seguiría viajando dentro de un token
todavía válido.

---

## 4. Servicios

| Archivo | Qué hace |
|---|---|
| [`lib/billing/config-service.ts`](lib/billing/config-service.ts) | `getConfig`, `saveConfig`, `validateConfig`, `checkEmissionReadiness` |
| [`lib/billing/ose-service.ts`](lib/billing/ose-service.ts) | `resolveIssuer`, `testConnection`, `emitDocument`, `parseResponse` |
| [`lib/billing/crypto.ts`](lib/billing/crypto.ts) | `encrypt` / `decrypt` (AES-256-GCM). **Es el servicio de cifrado**; no hay un segundo |
| [`lib/billing/igv.ts`](lib/billing/igv.ts) | `calculateIGV`, `getTotalWithIGV`, `breakdownFromTotal`, `breakdownLine` |
| [`lib/billing/correlatives.ts`](lib/billing/correlatives.ts) | `peekCorrelative` (leer) vs `drawCorrelative` (reservar) |
| [`lib/billing/cdr-service.ts`](lib/billing/cdr-service.ts) | `openCdr`, `settleCdr`, `listCdrs`, `getCdr` |
| [`lib/billing/emission.ts`](lib/billing/emission.ts) | El recorrido completo. **Un solo camino** para la caja y para la API |
| [`lib/billing/adapters/nubefact.ts`](lib/billing/adapters/nubefact.ts) | El primer OSE con el que FoodFlow sabe hablar |

### El IGV y la trampa peruana

Una carta peruana publica precios **con IGV incluido**: el plato que dice S/ 45
se cobra 45, no 53.10. SUNAT recibe base e impuesto por separado. Casi todo lo
que hace `igv.ts` es *sacar* el IGV de un precio que ya lo trae dentro.

La otra trampa es el redondeo: base e IGV se redondean a dos decimales cada uno
y su suma tiene que dar **exactamente** el total pagado, o el OSE rechaza el
documento. Por eso el IGV se deriva como `total − base` en vez de calcularse por
su cuenta. Verificado sobre 200 000 importes distintos.

### Correlativos: dos funciones, no una

`peekCorrelative` es para pintar "el próximo será B001-00000124" en pantalla.
`drawCorrelative` es la única que mueve el contador (con el `increment` del
propio Postgres, así que dos cajas cobrando en el mismo segundo se llevan números
distintos) y la única que puede llamar el emisor. Un *peek* seguido de un *write*
sería una carrera.

---

## 5. Trabajos de fondo

**Por qué no hay Bull ni Redis.** El brief los pedía y en un servidor de toda la
vida serían la respuesta correcta. FoodFlow corre en Vercel: no hay proceso que
sobreviva a la petición, así que un worker de Bull no tendría dónde quedarse
escuchando, y Redis es una pieza más que pagar y vigilar — para tres tareas que
en el peor día mueven decenas de filas.

Lo que hay: tres funciones puras e idempotentes en
[`lib/billing/jobs.ts`](lib/billing/jobs.ts), disparadas por Vercel Cron. Cuando
el volumen lo pida, esas mismas funciones son el cuerpo de un worker de Bull sin
tocarles una línea; lo que cambia es quién las llama.

| Job | Cron | Qué hace |
|---|---|---|
| `retryFailedEmissions` | `*/10 * * * *` | Reintenta los `PENDIENTE` con backoff 2→4→8→…→360 min, máx. 8 intentos |
| `sendDocumentEmails` | `*/15 * * * *` | Manda los aceptados sin `emailed_at` |
| `backupCDRs` | `20 7 * * *` (02:20 Lima) | Copia a S3 los que no tienen `backup_url` |

Las rutas (`/api/cron/billing/*`) exigen `CRON_SECRET` por `Authorization:
Bearer`. **Fallan cerrado**: sin la variable responden 503 y no ejecutan nada.

> **Plan Hobby de Vercel:** solo admite 2 crons y solo diarios. Con Hobby, deja
> `backup-cdrs` y `retry-emissions` en horario diario, o dispáralos desde fuera
> (GitHub Actions, cron-job.org) con la misma cabecera.

El respaldo a S3 está **apagado si no hay variables** — no es un error. El bucket
debe ser **privado**: dentro van comprobantes con el DNI o el RUC de personas
reales. Sirve cualquier S3 compatible (AWS, R2, B2, MinIO) vía `S3_ENDPOINT`;
la firma SigV4 está escrita a mano en [`lib/storage/s3.ts`](lib/storage/s3.ts)
para no cargar el SDK de AWS en el bundle por una operación al día.

---

## 6. Variables de entorno

| Variable | Obligatoria | Qué pasa sin ella |
|---|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Sí | Nada funciona |
| `BILLING_ENCRYPTION_KEY` | Recomendada | Se deriva de `AUTH_SECRET`: funciona, pero rotar `AUTH_SECRET` dejaría ilegible cada certificado guardado |
| `CRON_SECRET` | Para los jobs | Las rutas de cron responden 503 |
| `S3_BUCKET_CDRS`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT` | No | El respaldo no corre (no es un error) |
| `SMTP_*` | Para el correo | En desarrollo se registra en consola; en producción falla |

Detalle y cómo generarlas: [`.env.example`](.env.example).

---

## 7. Estado del adaptador OSE

**Nubefact está escrito contra su API pública documentada, pero no se ha probado
todavía contra una cuenta real.** Antes de la primera emisión de verdad hay que
pasarlo por una cuenta demo: los nombres de campo están verificados contra su
documentación, pero un OSE cambia detalles sin avisar y aquí un detalle cuesta un
comprobante rechazado.

Mientras tanto el sistema **falla cerrado**: si el OSE no responde o el proveedor
no tiene adaptador, la emisión falla, se archiva el motivo y la caja entrega la
nota de venta interna. `sunatStatus = "aceptado"` **solo** se escribe cuando el
OSE lo dijo. Estampar "aceptado" sobre un documento que SUNAT nunca recibió es lo
único de todo esto que puede multar a un restaurante.

Añadir otro proveedor es implementar `OseAdapter` (dos métodos: `emit` y `test`)
y registrarlo en `ADAPTERS` dentro de [`lib/billing/emit.ts`](lib/billing/emit.ts).
Todo lo demás — credenciales, correlativos, CDR, reintentos, estados de la caja —
ya está.

---

## 8. Equivalencia con el esquema del brief

| Brief (`billing_config`) | Aquí |
|---|---|
| `ruc`, `razon_social`, `direccion`, `telefono` | `ReceiptSettings.ruc / legalName / address / phone` |
| `correo_notificacion` | `ReceiptSettings.sunatEmail` |
| `certificate_pfx`, `certificate_password` | `BillingCredentials.certDataEnc / certPasswordEnc` (AES-256-GCM) |
| `ose_provider` | `ReceiptSettings.oseProvider` (+ `oseEndpoint`, que el brief no contemplaba y Nubefact exige: da una URL por contribuyente) |
| `ose_api_key`, `ose_api_secret` | `BillingCredentials.oseApiKeyEnc / oseApiSecretEnc` |
| `serie_boleta`, `serie_factura`, `serie_nc` | `ReceiptSettings.boletaSeries / facturaSeries / creditSeries` |
| `correlativo_actual` | **Tres** contadores, no uno: `boletaCounter`, `facturaCounter`, `creditCounter`. SUNAT numera cada serie por separado y un contador compartido produciría huecos en las tres |
| `is_configured` | Derivado, no almacenado: `checkEmissionReadiness()`. Una bandera guardada se queda mintiendo en cuanto vence el certificado |
| `last_test_connection` | `BillingCredentials.lastTestAt` (+ `lastTestOk`, `lastTestMessage`) |

En `cdrs`, respecto del brief: `estado` es un enum de Postgres en vez de texto
libre, `total` es `DECIMAL(10,2)` (un comprobante que dice 45.29 tiene que seguir
diciendo 45.29 tras el viaje a la base), y se añadieron `order_id`, `cliente_email`,
`codigo_sunat`, `xml_url`, `backup_url`, `attempts`, `last_attempt_at` y
`emailed_at` — los reintentos, el envío por correo y el respaldo que pedía el
propio brief no se pueden llevar sin ellos.
