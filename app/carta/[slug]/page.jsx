import { notFound } from "next/navigation";
import { readCarta } from "@/lib/db/carta";
import { SITE_URL } from "@/lib/seo";
import { cartaPrice } from "@/lib/carta";
import PhysicalCartaView from "@/components/public/PhysicalCartaView";

// A price can change while someone is walking to the table; this page is never
// served from a cache, and the SSE stream keeps it current after that.
export const dynamic = "force-dynamic";

async function load(params) {
  const { slug } = await params;
  return { slug, carta: await readCarta(slug) };
}

export async function generateMetadata({ params }) {
  const { slug, carta } = await load(params);
  if (!carta) return { title: "Carta no encontrada", robots: { index: false } };

  const { venue } = carta;
  const description =
    venue.tagline ??
    `Carta de ${venue.name}${venue.address ? ` · ${venue.address}` : ""}. Precios actualizados al momento.`;

  return {
    title: `Carta de ${venue.name}`,
    description,
    alternates: { canonical: `/carta/${slug}` },
    openGraph: {
      title: `Carta de ${venue.name}`,
      description,
      type: "website",
      url: `/carta/${slug}`,
      siteName: venue.name,
      locale: "es_PE",
    },
    twitter: { card: "summary", title: `Carta de ${venue.name}`, description },
  };
}

/**
 * A venue's menu, as a diner sees it.
 *
 * Server-rendered so the first paint is the menu itself — a QR scan on café
 * data should not wait for a client fetch — and so search engines and link
 * previews get real content. The client component takes it from there and
 * keeps it live.
 */
export default async function CartaPage({ params }) {
  const { carta } = await load(params);
  if (!carta) notFound();

  const cheapest = carta.items.length
    ? Math.min(...carta.items.map((item) => item.price))
    : null;

  // Structured data so a Google result for the venue can show the menu rather
  // than just a link to it.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: carta.venue.name,
    url: `${SITE_URL}/carta/${carta.venue.slug}`,
    ...(carta.venue.address ? { address: carta.venue.address } : {}),
    ...(carta.venue.whatsapp ? { telephone: `+51${carta.venue.whatsapp}` } : {}),
    servesCuisine: "Peruana",
    hasMenu: {
      "@type": "Menu",
      name: `Carta de ${carta.venue.name}`,
      hasMenuSection: carta.categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name,
        hasMenuItem: carta.items
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            "@type": "MenuItem",
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            offers: {
              "@type": "Offer",
              price: item.price.toFixed(2),
              priceCurrency: "PEN",
              availability: item.available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          })),
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Built from this venue's own rows, not from anything a visitor sent.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Read by nothing on screen — it is what a screen reader announces
          first, and what a text-only crawler sees before the client mounts. */}
      <p className="sr-only">
        {carta.venue.name} · {carta.items.length} platos
        {cheapest != null ? ` desde ${cartaPrice(cheapest)}` : ""}
      </p>
      <PhysicalCartaView initial={carta} />
    </>
  );
}
