# Revisión de cumplimiento legal (Perú) — 2026-09-13

**Esto no es asesoría legal.** Es una auditoría técnica del código contra lo
que exige la normativa peruana que conozco (Ley 29733 de Protección de Datos
Personales + su reglamento D.S. 003-2013-JUS, Código de Protección y Defensa
del Consumidor — Ley 29571, D.S. 011-2011-PCM del Libro de Reclamaciones,
normativa de comprobantes electrónicos SUNAT). Para algunos puntos marco
explícitamente que no tengo certeza suficiente y que hace falta un abogado
peruano o la guía oficial de la autoridad — los señalo como tales, no los
afirmo como hechos.

**Veredicto general: no encontré una infracción flagrante que ponga la
plataforma en riesgo inmediato.** El proyecto ya tiene, de antes de esta
sesión, la mayoría del andamiaje legal que un negocio de este tipo necesita en
Perú (Libro de Reclamaciones, Términos, Política de Privacidad, comprobantes
que fallan cerrado). Encontré **una contradicción real entre lo que el sitio
promete y lo que el código hacía** (Google Analytics), que corregí en esta
misma sesión, y una lista de puntos a verificar antes de operar con clientes
reales y dinero real.

---

## 1. Lo que ya está bien hecho (para calibrar el riesgo)

- **Libro de Reclamaciones Virtual** (`/libro-de-reclamaciones`,
  `lib/actions/claims.ts`): identifica al proveedor, genera un número
  correlativo `LR-AAAA-NNNNNN`, promete respuesta en 30 días hábiles, acepta
  DNI/carné de extranjería, tiene honeypot + rate limit generoso (5/h — para
  no rechazar un reclamo real). Esto es exactamente lo que exige el D.S.
  011-2011-PCM.
- **Términos y Condiciones** (`lib/legal/terms.ts`): jurisdicción Cercado de
  Lima, garantía de devolución de 30 días, límite de responsabilidad con la
  salvedad correcta ("nada de lo anterior limita los derechos que te reconoce
  la Ley 29571"), promesa de portabilidad de datos (export CSV en 48h).
- **Política de Privacidad** (`lib/legal/privacy.ts`): identifica al
  responsable del banco de datos, base legal y plazos de conservación,
  derechos ARCO con plazos de respuesta, medidas de seguridad, y **ya
  divulgaba el flujo transfronterizo de datos** (Neon en EE.UU., SMTP) antes
  de esta revisión — muchos negocios peruanos ni eso hacen.
- **Comprobantes SUNAT fallan cerrado**: `lib/receipt.ts` y `Order.sunatStatus`
  garantizan que nunca se imprime "BOLETA ELECTRÓNICA" salvo que SUNAT
  realmente la haya aceptado; mientras tanto se imprime una Nota de Venta
  interna que dice explícitamente que no es comprobante autorizado. Esta es
  la decisión correcta — la alternativa (imprimir "boleta" sin respaldo) es
  la forma más común en que un negocio pequeño en Perú termina con una multa.
  El desglose de IGV solo se activa si el restaurante declara estar afecto.
- **Contraseñas**: bcrypt, mínimo 10 rounds, complejidad mínima exigida
  (`lib/auth/password.ts`) — respalda la promesa de la Política de Privacidad
  §7 ("contraseñas nunca almacenadas en texto plano").
- **Exportación de datos** (`app/api/export/route.ts`): solo el dueño
  (`ownerOnly`), sin caché, protegida contra inyección de fórmulas CSV.
- Ya existe un `docs/VERIFICATION_CHECKLIST.md` pre-lanzamiento que cubre el
  Libro de Reclamaciones y la facturación — señal de que esto ya se estaba
  tomando en serio antes de que yo entrara.

---

## 2. Corregido en esta sesión: Google Analytics contradecía la política publicada

**Esto era el hallazgo más concreto y accionable** — no una zona gris, sino
una contradicción textual entre lo que el sitio le promete al usuario y lo
que el código hacía.

- `app/layout.jsx` cargaba el script de Google Analytics **de forma
  incondicional** en cuanto `NEXT_PUBLIC_GA_MEASUREMENT_ID` estuviera
  configurado — sin mirar la elección de cookies del visitante.
- `lib/consent.js` ya documentaba la regla que se suponía debía seguirse:
  *"call `hasAnalyticsConsent()` and do nothing when it is false"* — nunca se
  conectó.
- El banner de cookies, `/cookies` (ES y EN) y la Política de Privacidad §8
  afirmaban literalmente **"no hay rastreo de terceros"** / *"si algún día
  añadimos medición, solo se activará si aceptas este aviso"*.

Resultado: todo visitante —incluido quien hacía clic explícito en "Solo las
necesarias"— recibía tracking de Google (cookie `_ga`, IP) sin el
consentimiento que el propio sitio decía exigir.

Bajo la Ley 29733 esto es tratar datos personales (IP, señales de
comportamiento vía Google) sin el consentimiento previo, informado y expreso
que la ley exige (Art. 5). Bajo el Código de Protección y Defensa del
Consumidor, publicar una política que describe una práctica de datos falsa es
del tipo de "información y publicidad engañosa" que INDECOPI sanciona
directamente — independiente de la LPDP. Es el escenario más parecido a
"demandable" que encontré, y el más barato de cerrar.

**Qué cambié:**

| Archivo | Cambio |
|---|---|
| [components/Analytics.jsx](components/Analytics.jsx) *(nuevo)* | Componente cliente: solo inyecta los scripts de GA4 si `hasAnalyticsConsent()` es verdadero; escucha el cambio de consentimiento para activarse sin recargar la página. |
| [lib/consent.js](lib/consent.js) | `saveConsent()` ahora emite un evento (`CONSENT_EVENT`) para que `Analytics` reaccione al instante cuando aceptas el aviso. |
| [app/layout.jsx](app/layout.jsx) | Reemplacé los `<Script>` incondicionales por `<Analytics>`. |
| [lib/i18n/dictionaries.js](lib/i18n/dictionaries.js) | Banner y sección "Medición y publicidad" de `/cookies` (ES + EN): ahora dicen la verdad — sin publicidad, con medición **solo si aceptas**. |
| [lib/legal/privacy.ts](lib/legal/privacy.ts) | §8 Cookies: divulga Google Analytics como el proveedor de medición opcional. |
| [lib/legal/holder.ts](lib/legal/holder.ts) | `LEGAL_UPDATED` → 13 de septiembre de 2026 (el contenido cambió en sustancia). |

**Verificado en dev**: sin decisión de cookies → cero scripts de Google en el
DOM. Aceptar "todo" → los scripts se inyectan al instante. Elegir "solo las
necesarias" → siguen ausentes tras recargar. `npx tsc --noEmit` limpio, sin
errores de servidor. `/cookies` y `/privacidad` muestran el texto nuevo.

---

## 3. Pendiente de confirmar o decidir (no lo toqué — son decisiones tuyas o requieren datos que no tengo)

### 3.1 RUC de FoodFlow en producción — confirmar
El `.env` local no tiene `NEXT_PUBLIC_LEGAL_TAX_ID` ni el resto de
`NEXT_PUBLIC_LEGAL_*` (por eso `lib/legal/holder.ts` cae a los valores por
defecto: "Adonys Pereda", sin RUC). `docs/VERIFICATION_CHECKLIST.md` ya pide
confirmar estas variables en Vercel antes de lanzar, así que puede que ya
estén puestas en Production y esto no aplique — no pude verificar Vercel desde
aquí. Si **no** hay RUC registrado: cobrar por un servicio SaaS de forma
habitual sin RUC es una situación de informalidad tributaria frente a SUNAT
(distinto del RUC de cada restaurante para sus propios comprobantes, que ya
está resuelto). Confírmalo.

### 3.2 Consentimiento para transferencia internacional de datos — ✅ Hecho (2026-09-13)
Antes, la Política de Privacidad §5 decía que el flujo transfronterizo (Neon
en EE.UU., SMTP) se aceptaba "al usar el servicio" — un consentimiento
implícito. Ahora es un acto explícito:

- `/register` tiene una casilla **obligatoria, nunca premarcada**
  (`ConsentCheckbox` en `components/auth/AuthForm.tsx`), que nombra la
  transferencia internacional de forma explícita: *"He leído y acepto los
  Términos y Condiciones y la Política de Privacidad, incluida la
  transferencia internacional de mis datos que ahí se describe."* Enlaza a
  `/terminos` y `/privacidad` (se abren en pestaña nueva para no perder el
  formulario).
- Se valida en el cliente (bloquea el envío, enfoca el error) **y en el
  servidor** (`app/api/auth/register/route.ts`, `z.boolean().refine(...)`) —
  un cliente manipulado no puede saltarse la casilla.
- El momento del consentimiento queda grabado: `User.consentAt` (migración
  `20260913213436_add_user_consent`), el mismo patrón que ya usaba
  `Lead.consentAt` en el formulario de leads.
- El formulario de leads (`components/lead/LeadForm.jsx`) **ya tenía** esta
  casilla desde antes — no lo toqué. El Libro de Reclamaciones sigue sin
  casilla a propósito (ese registro existe por obligación legal, no por
  consentimiento — así lo documenta el propio código).
- `lib/legal/privacy.ts` §5 actualizado: ya no dice "aceptas al usar el
  servicio", sino que remite a la casilla del formulario correspondiente
  (registro o leads).

Verificado en el navegador: enviar el formulario sin marcar → error inline,
foco en la casilla, sin llamada al servidor. Marcar y enviar → `201`,
`consentAt` grabado con la hora exacta, sesión iniciada, sin errores.

### 3.3 Plazos ARCO y registro del banco de datos — verificar con la autoridad o un abogado
La Política de Privacidad promete 10 días hábiles para acceso y 20 para el
resto de derechos ARCO. No tengo certeza suficiente de que esas cifras sigan
siendo las vigentes tal cual bajo la reglamentación actual (y la Ley 32130 de
2024 reestructuró la autoridad de protección de datos) — no quiero afirmarlo
como correcto ni como incorrecto sin confirmarlo. Lo mismo para si el banco de
datos de FoodFlow necesita registrarse ante la Autoridad Nacional de
Transparencia y Protección de Datos Personales. Esto sí te lo dejaría
verificar con un abogado o directamente con la autoridad, no es algo que deba
decidir yo por inferencia.

### 3.4 Nota de consistencia operativa (no es un hallazgo de código)
Los Términos prometen devolución "por el mismo medio de pago" en 15 días
hábiles durante la garantía de 30 días. No encontré ninguna pasarela de pago
integrada (Culqi, MercadoPago, Niubiz, etc.) — lo cual está bien si hoy cobras
por transferencia/Yape manual, pero significa que esa promesa la cumples tú a
mano. Vale la pena que el proceso real (cómo devuelves, en cuánto tiempo)
coincida con lo que el texto promete, porque ese texto es ahora un compromiso
contractual exigible.

### 3.5 Nota de seguridad menor (no es específicamente de Perú)
`next.config.mjs` tiene `images.remotePatterns: [{ protocol: "https",
hostname: "**" }]` — el optimizador de imágenes de Next puede ir a buscar
cualquier URL https que un dueño de restaurante pegue como foto de un plato.
Es una decisión ya documentada en el propio código (el dueño pega enlaces de
su fotógrafo/CDN, no hay lista fija que permitir de antemano) y el riesgo es
bajo dado el sandboxing de Vercel, pero lo señalo como algo a tener presente,
no como una infracción legal.

---

## Resumen para decidir qué hacer ahora

| # | Punto | Estado |
|---|---|---|
| 1 | Google Analytics sin consentimiento real | ✅ Corregido esta sesión |
| 2 | RUC de FoodFlow en Vercel Production | ⏳ Confirmar tú |
| 3 | Consentimiento explícito para transferencia internacional | ✅ Corregido esta sesión |
| 4 | Plazos ARCO / registro del banco de datos | ⏳ Verificar con abogado o autoridad |
| 5 | Consistencia operativa de reembolsos | ⏳ Nota, no requiere código |
| 6 | `images.remotePatterns` wildcard | ⏳ Nota de seguridad, no legal |

Si quieres, para el punto 3 puedo añadir un checkbox explícito de
transferencia internacional al registro — dime y lo dejamos como una fase
aparte, siguiendo el mismo criterio de "no cambiar un flujo sin decirlo antes"
que usamos en `SEGURIDAD.md`.
