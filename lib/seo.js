/**
 * The handful of strings every SEO surface needs to agree on: the canonical
 * origin, and the descriptions that have to read the same in the meta tag, in
 * the Open Graph card and in the Organization markup. Kept here so a change
 * lands in all of them at once instead of drifting between them.
 *
 * Two titles on purpose, because the two surfaces are answering different
 * questions. SITE_TITLE is what shows in Google, so it leads with the words a
 * restaurant owner in Lima actually types ("sistema para restaurantes",
 * "sin comisión"). SOCIAL_TITLE is what shows when the link is pasted into
 * WhatsApp, where nobody is searching and the pitch converts better.
 *
 * Lengths are held to what Google renders before truncating: ~60 characters
 * for the title, ~155 for the description. Longer is not penalised, it is
 * just cut off mid-sentence.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodflow.site";

export const SITE_NAME = "FoodFlow";

/** 57 chars. Query-first: the keyword, the city, the differentiator. */
export const SITE_TITLE =
  "FoodFlow · Sistema para restaurantes en Lima sin comisión";

/** 139 chars. Carries "carta digital", "sin comisión", "Perú" and "S/ 69". */
export const SITE_DESCRIPTION =
  "Carta digital QR, pedidos y pantalla de cocina para restaurantes en Lima, Perú. 0% de comisión por pedido y web propia. Desde S/ 69 al mes.";

/** The pitch, for the surfaces where the reader is not searching. */
export const SOCIAL_TITLE = "FoodFlow — Tu restaurante funcionando en 48 horas";

export const SOCIAL_DESCRIPTION =
  "Pedidos, cocina, carta y números en un solo panel, sin comisión por pedido. Programa piloto en Lima con plazas limitadas.";

/**
 * What the Organization block says about itself. Longer than the meta
 * description, because structured data is not truncated and this is the
 * paragraph an AI summary is most likely to quote back.
 */
export const ORG_DESCRIPTION =
  "FoodFlow es el sistema de gestión para restaurantes, cafés y pollerías de Lima: carta digital con QR por mesa, pedidos de salón, para llevar y delivery en una sola cola, pantalla de cocina y tu propia web de pedidos sin comisión por pedido. Desde S/ 69 al mes.";

/**
 * Real, verifiable reviews from restaurants running FoodFlow. EMPTY ON
 * PURPOSE — the pilot has no customers yet.
 *
 * While this is empty, no `aggregateRating` is emitted anywhere. That is not
 * an oversight: star markup that is not backed by reviews a visitor can find
 * on the page is a structured-data policy violation, and Google's answer is a
 * manual action that strips every rich result from the domain. It also loses
 * the restaurant owner who clicks through, sees five stars and no reviews,
 * and closes the tab.
 *
 * To turn ratings on: publish the testimonials on the site first, then add
 * one entry per real review here. `ratingValue` is 1-5.
 *
 *   { author: "Nombre del dueño", business: "Nombre del local",
 *     ratingValue: 5, body: "…", datePublished: "2026-10-01" }
 */
export const REVIEWS = [];

/**
 * Public cartas that must stay out of Google. /carta/tanta is the demo we
 * open in sales calls (scripts/seed-demo.mjs); it is a real, published carta
 * so the demo works, but it is not a customer and the name belongs to a real
 * restaurant group — indexing it would put a fake "Carta de Tanta" in their
 * search results. Real customers' cartas stay indexable.
 */
export const NOINDEX_CARTA_SLUGS = new Set(["tanta"]);

/**
 * Who writes the guides. A named person with a page behind them (/nosotros,
 * with the real portrait) is what Google and AI answers look for before they
 * trust a page about prices and commissions; "FoodFlow" as author is not one.
 * Spelling is "Adonys", as on /nosotros — confirmed by him on 2026-11-15.
 */
export const FOUNDER = {
  name: "Adonys Pereda",
  jobTitle: "Fundador de FoodFlow",
  url: `${SITE_URL}/nosotros`,
  image: `${SITE_URL}/Founder.jpg`,
};

/**
 * When each guide was first published and last changed in a way a reader
 * would notice. Shown under the title ("Actualizado el …") and declared in the
 * Article markup, so the two always agree. Bump `modified` — and the route's
 * `updated` in app/sitemap.js — when you edit a guide's copy.
 */
export const GUIDE_DATES = {
  "/sistema-para-restaurantes": { published: "2026-11-15", modified: "2026-11-15" },
  "/comanda-digital": { published: "2026-11-15", modified: "2026-11-15" },
  "/pantalla-de-cocina": { published: "2026-11-15", modified: "2026-11-15" },
  "/mesas-y-reservas": { published: "2026-11-15", modified: "2026-11-15" },
  "/piloto": { published: "2026-11-15", modified: "2026-11-15" },
  "/carta-digital-qr": { published: "2026-09-13", modified: "2026-11-15" },
  "/comisiones-rappi-pedidosya": { published: "2026-09-13", modified: "2026-11-15" },
  "/vender-sin-comision": { published: "2026-09-13", modified: "2026-11-02" },
  "/alternativa-a-rappi": { published: "2026-09-13", modified: "2026-11-02" },
  "/web-de-pedidos": { published: "2026-09-13", modified: "2026-11-02" },
};
