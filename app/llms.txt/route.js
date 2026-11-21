import { dictionaries } from "@/lib/i18n/dictionaries";
import { FOUNDER, ORG_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * /llms.txt — a plain-Markdown map of the site for AI assistants (the
 * llmstxt.org convention: an H1, a one-paragraph summary, then link lists).
 *
 * Built from the same dictionary the pages render, so a price or a plan name
 * here can never disagree with /precios. It has no effect on Google ranking;
 * it is for ChatGPT, Claude, Perplexity and friends when someone asks them
 * what FoodFlow is or what it costs.
 */
export const dynamic = "force-static";

const es = dictionaries.es;

const GUIDES = [
  ["/sistema-para-restaurantes", "Sistema para restaurantes en Lima"],
  ["/comanda-digital", "Comanda digital: el pedido del mozo, directo a cocina"],
  ["/pantalla-de-cocina", "Pantalla de cocina (KDS)"],
  ["/mesas-y-reservas", "Plano de mesas y reservas"],
  ["/piloto", "Cómo es el piloto de 48 horas en Lima"],
  ["/carta-digital-qr", "Carta digital con QR para restaurantes"],
  ["/web-de-pedidos", "Web de pedidos propia, sin comisión"],
  ["/comisiones-rappi-pedidosya", "Cuánto cobran Rappi y PedidosYa en Perú"],
  ["/vender-sin-comision", "Cómo vender delivery sin comisión"],
  ["/alternativa-a-rappi", "Alternativas a Rappi para restaurantes"],
  ["/boleta-electronica-restaurantes", "Boleta electrónica en restaurantes: qué te toca"],
  ["/yape-plin-restaurantes", "Cobrar con Yape y Plin en un restaurante"],
  ["/libro-de-reclamaciones-restaurantes", "Libro de Reclamaciones para restaurantes"],
  ["/calculadora", "Calculadora de comisiones de delivery"],
];

export function GET() {
  // Price from the chat plan list (the one lib/plans.test.ts keeps in step
  // with checkout); what's included from the landing's plain one-liners, not
  // the marketing taglines.
  const included = Object.fromEntries(es.landing.plans.items.map((p) => [p.name, p.copy]));
  const plans = es.chat.plans.items
    .map((p) => `- **${p.name}** — ${p.price} al mes, IGV incluido. ${included[p.name] ?? ""}`.trimEnd())
    .join("\n");

  const guides = GUIDES.map(([path, label]) => `- [${label}](${SITE_URL}${path})`).join("\n");

  const body = `# ${SITE_NAME}

> ${ORG_DESCRIPTION}

${SITE_NAME} es un software web (no hace falta instalar nada) para restaurantes, cafés y pollerías de Lima, Perú. Conecta la carta con QR por mesa, la comanda en el teléfono del mozo, la pantalla de cocina, el plano de mesas y una web de pedidos propia, sin comisión por pedido. Lo dejamos funcionando en 48 horas. Está en piloto en Lima.

## Planes

${plans}

${es.landing.plans.note}

- [Precios y comparación de planes](${SITE_URL}/precios)

## Guías

${guides}

## Empresa

- [Preguntas frecuentes](${SITE_URL}/preguntas)
- [Quiénes somos: ${FOUNDER.name}, fundador](${SITE_URL}/nosotros)
- [Términos y condiciones](${SITE_URL}/terminos)
- [Política de privacidad](${SITE_URL}/privacidad)
- [Libro de reclamaciones](${SITE_URL}/libro-de-reclamaciones)
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
