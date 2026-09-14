# Páginas SEO pendientes

Ticket de desarrollo. Autocontenido: no hace falta contexto de ninguna conversación previa.

## Por qué existe este documento

Una auditoría de las diez consultas de cola larga por las que FoodFlow puede
competir en Google Perú encontró que **cinco no tenían página**. El sitio estaba
bien optimizado para lo que ya decía; lo que le faltaba era decir más cosas.

Dos de esas cinco ya están hechas y son el patrón a copiar:

| Ruta | Consulta objetivo | Estado |
| --- | --- | --- |
| `/comisiones-rappi-pedidosya` | «cuánto cobra Rappi de comisión» | ✅ Hecha |
| `/vender-sin-comision` | «cómo vender comida sin pagar comisión» | ✅ Hecha |
| `/carta-digital-qr` | «carta digital con QR para restaurantes Lima» | ⬜ Pendiente |
| `/alternativa-a-rappi` | «alternativa a Rappi para mi restaurante» | ⬜ Pendiente |
| `/web-de-pedidos` | «página web de pedidos para mi restaurante Perú» | ⬜ Pendiente |

Quedan tres. Este ticket las especifica.

---

## Reglas que no se negocian

Van primero porque son la parte que más fácil se rompe y la que más caro cuesta.

### 1. Nada de datos inventados

El piloto **todavía no tiene clientes**. En todo el sitio no puede aparecer un
número de clientes, un logo, un testimonio ni una estrella que no exista.

- `REVIEWS` en `lib/seo.js` es un array **vacío a propósito**. Mientras lo esté,
  no se emite ningún `aggregateRating` en ninguna parte. **No lo rellenes.** Solo
  se llena cuando haya reseñas reales publicadas y visibles en el sitio.
- No añadas `aggregateRating`, `review` ni `ratingCount` a ningún schema nuevo.

### 2. Rangos, no tarifas

Las comisiones de las apps se negocian local por local y cambian con el tiempo.
Escribe siempre **rangos** («20% – 30%»), nunca una cifra presentada como tarifa
oficial, y remite al lector a su propia liquidación o contrato. Lo mismo aplica a
comisiones de pasarela y condiciones bancarias.

Los precios de FoodFlow sí son exactos, y salen de una sola fuente:
`lib/i18n/dictionaries.js` → `chat.plans.items` (S/ 79 · S/ 179 · S/ 349).
No los retipees en otro sitio.

### 3. Honestidad como táctica, no como adorno

Las dos páginas hechas funcionan porque **argumentan las dos caras**:

- `/comisiones-rappi-pedidosya` responde la pregunta antes de vender nada.
- `/vender-sin-comision` tiene un bloque entero (`keep`) sobre cuándo **sí**
  conviene quedarse en las apps, y cada canal propio declara su `catch`.

Una página que solo defiende un lado se lee como anuncio y se trata como tal,
por los lectores y por Google. Cada página nueva necesita su equivalente: un
bloque que diga qué pierdes o cuándo esto no es para ti.

### 4. Bilingüe siempre

`lib/i18n/dictionaries.js` tiene dos diccionarios completos, `es` y `en`.
**Todo texto nuevo va en los dos.** Cero strings en castellano dentro de los
componentes: si necesitas una etiqueta («Costo», «Forma de cobro»), va al
diccionario, no como literal ni como `?? "fallback"`.

---

## El patrón, archivo por archivo

Siete pasos. Copia `/vender-sin-comision` como referencia viva.

### 1. Copy → `lib/i18n/dictionaries.js`

Inserta una clave nueva **antes de `footer:`**, en `es` y en `en`. El fichero es
grande; un script de inserción en el scratchpad es más fiable que un edit a mano.

### 2. Sección → `components/sections/<Nombre>.jsx`

```jsx
"use client";
// ...
export default function Nombre({ as }) {
  const { t } = useLanguage();
  const c = t.miClave;

  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <Container>
        <SectionHeading as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />
        {/* bloques */}
      </Container>
    </section>
  );
}
```

Primitivas disponibles en `components/ui/`: `Container`, `SectionHeading`,
`Reveal` + `RevealGroup` / `RevealItem`, `GlassCard`, `Button`, `Badge`,
`Icons`. No introduzcas dependencias nuevas.

**Sobre `as`:** `SectionHeading` renderiza `h2` por defecto. La página es quien
decide, porque es lo único que sabe qué es. Sin esto la ruta arranca en `h2` y
no tiene `h1`, que era exactamente el bug que se arregló.

### 3. Ruta → `app/<slug>/page.jsx`

```jsx
export const metadata = {
  title: "…",                 // ≤ 49 caracteres (el layout añade " · FoodFlow")
  description: "…",           // ≤ 155 caracteres
  alternates: { canonical: "/<slug>" },
};

export default function Pagina() {
  return (
    <SiteShell>
      <NombreJsonLd />
      <BreadcrumbJsonLd name="…" path="/<slug>" />
      <Nombre as="h1" />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
```

El canonical **va por página, nunca en el layout**: heredado, marcaría
`/login` y `/dashboard` como duplicados de la home.

### 4. Datos estructurados → `components/seo/JsonLd.jsx`

Añade un `<Nombre>JsonLd` con `Article` + `FAQPage`, leyendo del mismo
diccionario que renderiza la página, para que el marcado no pueda citar una
respuesta que ya no está. Copia `SellDirectJsonLd`.

> **Condición de Google para el marcado FAQ:** cada respuesta declarada en el
> schema tiene que estar **visible en el HTML**. Por eso los FAQ de estas
> páginas son markup abierto y no un acordeón. No los conviertas en acordeón.

### 5. Sitemap → `app/sitemap.js`

Una entrada más en `ROUTES`. Prioridad `0.8` para estas páginas de contenido.

### 6. Enlace → `components/sections/Footer.jsx`

Añádela a `siteLinks`, con la etiqueta desde el diccionario.

> **No toques `Navbar.jsx`.** Ya lleva seis enlaces más dos botones, y su propio
> comentario avisa de que no cabe más por debajo de `lg`. Un séptimo rompe la
> barra en tablet.

### 7. Enlaces cruzados

Cada página nueva enlaza a las relacionadas **y recibe un enlace de vuelta**.
Las dos hechas se apuntan mutuamente; usa el mismo criterio.

---

## Las tres páginas

### A. `/carta-digital-qr`

**Consulta:** «carta digital con QR para restaurantes Lima» · transaccional ·
dificultad media
**Clave de diccionario sugerida:** `qrMenu`
**Qué vende:** el plan Carta, S/ 79/mes. Hoy no tiene página propia.

Bloques mínimos:

1. Qué es y qué problema resuelve (cambiar precios sin reimprimir, sin app que
   descargar, funciona en el navegador del comensal).
2. Cómo funciona, en tres pasos: cargamos tu carta → generas los QR de mesa →
   el comensal escanea y pide.
3. **Demo real.** `/carta/[slug]` es una carta pública de verdad. Antes de
   enlazarla, comprueba a qué slug apunta: `scripts/seed-demo.mjs:236` siembra
   `tanta`, y la siembra la hace `npm run db:seed-demo`. **Verifica que
   `/carta/<slug>` responde 200 antes de publicar el enlace** — no enlaces a un
   404. Si no hay carta sembrada, omite el enlace y anótalo.
4. Qué incluye el plan Carta, con el precio desde `chat.plans.items`.
5. El bloque honesto: para quién **no** es (si ya tienes un POS que hace esto,
   si tu carta no cambia nunca).
6. FAQ (4 preguntas) + CTA a `/precios`.

Cruza con: `/precios`, `/web-de-pedidos`.

### B. `/alternativa-a-rappi`

**Consulta:** «alternativa a Rappi para mi restaurante» · transaccional ·
dificultad baja
**Clave de diccionario sugerida:** `rappiAlternative`
**Ojo:** poco volumen, muchísima intención. Quien escribe esto ya decidió irse.

Bloques mínimos:

1. Qué estás comparando en realidad: Rappi es un **canal de descubrimiento**,
   no un software. Comparar «Rappi vs FoodFlow» sin decir esto es deshonesto y
   el lector lo nota.
2. Comparativa por columnas: comisión, de quién es el cliente, quién reparte,
   quién trae gente nueva, qué cuesta al mes.
3. **Qué pierdes al salir.** Obligatorio y explícito: visibilidad ante gente que
   no te conoce, la flota de reparto, el volumen en horas muertas.
4. La salida realista: los dos canales a la vez, no uno u otro.
5. FAQ (4) + CTA a `/calculadora`.

Cruza con: `/comisiones-rappi-pedidosya`, `/vender-sin-comision`.

### C. `/web-de-pedidos`

**Consulta:** «página web de pedidos para mi restaurante Perú» · transaccional ·
dificultad media
**Clave de diccionario sugerida:** `orderingSite`
**Qué vende:** el plan Negocio, S/ 349/mes.

> **Antes de escribir:** esto ya vive como la sección `CustomSite` en la home
> (`components/sections/CustomSite.jsx`, diccionario `customSite`). **No
> dupliques ese copy** — Google trataría una de las dos como contenido repetido.
> Decide una:
> - extraer `CustomSite` a la ruta nueva y dejar en la home un resumen corto que
>   enlace, o
> - escribir copy nuevo y distinto, dejando la sección de la home como está.
>
> La primera es más limpia. Anota cuál elegiste y por qué.

Bloques mínimos:

1. Qué es: tu dominio, tu carta, tus precios, 0% de comisión por pedido.
2. Cómo llega el pedido: entra al mismo panel y a la misma pantalla de cocina
   que el resto de canales, en una sola cola.
3. Cómo se cobra (Yape, Plin, transferencia, efectivo, pasarela) — mismos
   rangos honestos que `/vender-sin-comision`.
4. El bloque honesto: una web propia **no trae tráfico sola**; hay que llevarla
   tú (QR, redes, ticket, empaque).
5. FAQ (4) + CTA a `/precios`.

Cruza con: `/vender-sin-comision`, `/carta-digital-qr`, `/precios`.

---

## Criterios de aceptación

Por cada página, todo esto tiene que cumplirse:

- [ ] La ruta responde **200**
- [ ] **Exactamente un `<h1>`**, procedente de `as="h1"`
- [ ] `title` ≤ 60 caracteres **contando** el sufijo ` · FoodFlow`
- [ ] `description` ≤ 155 caracteres
- [ ] `alternates.canonical` declarado y correcto
- [ ] JSON-LD válido: `Organization`, `Article`, `FAQPage`, `BreadcrumbList`
- [ ] **Todas** las respuestas del `FAQPage` visibles en el HTML renderizado
- [ ] En el `sitemap.xml` y en el footer
- [ ] Enlace de ida y de vuelta con las páginas relacionadas
- [ ] Copy completo en `es` **y** en `en`; ni un literal castellano en el JSX
- [ ] Sin `undefined` en el HTML renderizado (clave de diccionario mal escrita)
- [ ] Sin scroll horizontal a 375 px; tablas y bloques anchos en su propio
      contenedor con `overflow-x: auto`
- [ ] Legible en tema claro **y** oscuro
- [ ] Las rutas que ya existían siguen respondiendo 200 con un solo `h1`

### Cómo verificarlo

El servidor de desarrollo es `npm run dev`. Ojo: `npm run build` ejecuta
`prisma migrate deploy` antes de compilar, así que **toca la base de datos** —
no lo lances a ciegas solo para comprobar que compila.

Un script de verificación sobre el servidor levantado cubre casi todo lo
anterior de una pasada: rutas y estado, conteo de `h1`, `undefined` colado,
tipos de JSON-LD, correspondencia entre las respuestas del `FAQPage` y el texto
visible, sitemap y enlaces cruzados. Lo demás (tema claro, 375 px) se mira en el
navegador.

### Contraste en tema claro

Cuidado con esto: las opacidades sueltas de `fg` no valen para texto en tema
claro. Usa las clases `text-cream/NN` que ya están en la tabla de remapeo de
`app/globals.css` (el tema claro las reasigna), o los tokens `text-muted` /
`text-faint` / `text-warn-ink`. Objetivo: **≥ 4.5:1** para texto normal.
