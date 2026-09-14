/**
 * The site map Google reads. Only the public marketing routes belong here —
 * /login and everything under /dashboard is behind the session cookie and is
 * blocked in robots.js, so listing it would just be an invitation to crawl a
 * wall of redirects.
 *
 * `priority` and `changeFrequency` are hints, not promises: the home page and
 * the two pages a restaurant owner lands on from a search ("precios",
 * "calculadora") lead, the legal page trails.
 */
import { SITE_URL as BASE } from "@/lib/seo";

const ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/precios", priority: 0.9, changeFrequency: "weekly" },
  { path: "/calculadora", priority: 0.9, changeFrequency: "monthly" },
  {
    path: "/comisiones-rappi-pedidosya",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  { path: "/vender-sin-comision", priority: 0.8, changeFrequency: "monthly" },
  { path: "/carta-digital-qr", priority: 0.8, changeFrequency: "monthly" },
  { path: "/alternativa-a-rappi", priority: 0.8, changeFrequency: "monthly" },
  { path: "/web-de-pedidos", priority: 0.8, changeFrequency: "monthly" },
  { path: "/preguntas", priority: 0.8, changeFrequency: "monthly" },
  { path: "/nosotros", priority: 0.6, changeFrequency: "monthly" },
  { path: "/libro-de-reclamaciones", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap() {
  const lastModified = new Date();

  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
