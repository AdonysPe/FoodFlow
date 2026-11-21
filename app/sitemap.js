/**
 * The site map Google reads. Only the public marketing routes belong here —
 * /login and everything under /dashboard is behind the session cookie and is
 * blocked in robots.js, so listing it would just be an invitation to crawl a
 * wall of redirects.
 *
 * `updated` is the date the page's content last changed in a way a reader
 * would notice — bump it by hand when you edit that page's copy. It used to
 * be `new Date()` at build time, which stamped all fourteen URLs with the
 * same minute on every deploy; Google learns to ignore a lastmod that always
 * moves, and then ignores it on the day it is true. `priority` and
 * `changeFrequency` are gone: Google reads neither.
 *
 * Dates as of the SEO audit (2026-11-15): marketing copy from the last
 * dictionary edit, legal pages from their own last edit.
 */
import { SITE_URL as BASE } from "@/lib/seo";

const ROUTES = [
  { path: "", updated: "2026-11-15" },
  { path: "/precios", updated: "2026-11-15" },
  { path: "/sistema-para-restaurantes", updated: "2026-11-15" },
  { path: "/comanda-digital", updated: "2026-11-15" },
  { path: "/pantalla-de-cocina", updated: "2026-11-15" },
  { path: "/mesas-y-reservas", updated: "2026-11-15" },
  { path: "/piloto", updated: "2026-11-15" },
  { path: "/boleta-electronica-restaurantes", updated: "2026-11-20" },
  { path: "/yape-plin-restaurantes", updated: "2026-11-20" },
  { path: "/libro-de-reclamaciones-restaurantes", updated: "2026-11-20" },
  { path: "/calculadora", updated: "2026-11-17" },
  { path: "/comisiones-rappi-pedidosya", updated: "2026-11-15" },
  { path: "/vender-sin-comision", updated: "2026-11-02" },
  { path: "/carta-digital-qr", updated: "2026-11-15" },
  { path: "/alternativa-a-rappi", updated: "2026-11-02" },
  { path: "/web-de-pedidos", updated: "2026-11-02" },
  { path: "/preguntas", updated: "2026-11-17" },
  { path: "/nosotros", updated: "2026-11-17" },
  { path: "/libro-de-reclamaciones", updated: "2026-11-20" },
  { path: "/terminos", updated: "2026-10-20" },
  { path: "/privacidad", updated: "2026-10-20" },
  { path: "/cookies", updated: "2026-09-13" },
];

export default function sitemap() {
  return ROUTES.map(({ path, updated }) => ({
    url: `${BASE}${path}`,
    lastModified: updated,
  }));
}
