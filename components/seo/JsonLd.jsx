import { dictionaries } from "@/lib/i18n/dictionaries";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/contact";
import { SOCIAL_LINKS } from "@/lib/social";
import {
  ORG_DESCRIPTION,
  REVIEWS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

/**
 * Structured data, in one place.
 *
 * Server components on purpose: this is markup for crawlers, so it has to be
 * in the HTML that arrives from Vercel, not something hydration adds later.
 *
 * Everything here is read from the Spanish dictionary rather than retyped, so
 * a price or a question can never say one thing on the page and another in
 * the markup — which is exactly the mismatch Google penalises.
 *
 * `aggregateRating` and `review` are wired up but gated on lib/seo.js's
 * REVIEWS array, which is empty while the pilot has no customers. Nothing is
 * emitted until real reviews are added there — inventing stars is both a
 * structured-data policy violation and the fastest way to lose a restaurant
 * owner who checks.
 */

const BASE = SITE_URL;
const es = dictionaries.es;

const ORG_ID = `${BASE}/#organization`;
const SITE_ID = `${BASE}/#website`;
const APP_ID = `${BASE}/#software`;
const BUSINESS_ID = `${BASE}/#business`;

/** Plaza Mayor. Only used to centre the service radius, never as an address. */
const LIMA = { lat: -12.0464, lng: -77.0428 };

function Script({ schema }) {
  return (
    <script
      type="application/ld+json"
      // The payload is our own dictionary, not user input. `<` is still
      // escaped so a stray character in the copy can never close the tag —
      // note the double backslash on the next line: a single backslash
      // before u003c is a JS Unicode escape that the parser resolves to a
      // literal "<" before .replace() ever runs, making it a no-op. Two
      // backslashes produce the six literal characters backslash-u-0-0-3-c,
      // which HTML never treats as a tag boundary and which any JSON
      // parser reading this script tag decodes back to "<".
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * The star rating, or nothing at all.
 *
 * Returns null while REVIEWS is empty, and every block that would carry a
 * rating spreads the result conditionally — so an empty list means no
 * `aggregateRating` property exists anywhere in the output, which is the only
 * correct state until real restaurants have said something on the record.
 *
 * `ratingValue` is computed from the reviews rather than written down, so the
 * number in the markup can never disagree with the testimonials on the page.
 */
function aggregateRating() {
  if (!REVIEWS.length) return null;

  const total = REVIEWS.reduce((sum, r) => sum + r.ratingValue, 0);

  return {
    "@type": "AggregateRating",
    // One decimal is what Google renders; more just gets rounded away.
    ratingValue: Number((total / REVIEWS.length).toFixed(1)),
    reviewCount: REVIEWS.length,
    bestRating: 5,
    worstRating: 1,
  };
}

/** The individual reviews behind that average. Empty until REVIEWS is filled. */
function reviewList() {
  return REVIEWS.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.author },
    ...(r.business
      ? { publisher: { "@type": "Organization", name: r.business } }
      : {}),
    reviewRating: {
      "@type": "Rating",
      ratingValue: r.ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: r.body,
    datePublished: r.datePublished,
    itemReviewed: { "@id": APP_ID },
  }));
}

/** Spreads `{ aggregateRating, review }` in, or spreads nothing. */
function ratingProps() {
  const rating = aggregateRating();
  if (!rating) return {};
  return { aggregateRating: rating, review: reviewList() };
}

/** Who we are. Referenced by @id from every other block, so it is stated once. */
const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: BASE,
  email: CONTACT_EMAIL,
  sameAs: SOCIAL_LINKS.map((s) => s.href),
  logo: {
    "@type": "ImageObject",
    url: `${BASE}/icon.svg`,
  },
  description: ORG_DESCRIPTION,
  areaServed: {
    "@type": "City",
    name: "Lima",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lima",
      addressCountry: "PE",
    },
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: CONTACT_EMAIL,
    telephone: `+${WHATSAPP_NUMBER}`,
    areaServed: "PE",
    availableLanguage: ["es", "en"],
  },
};

const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  url: BASE,
  name: SITE_NAME,
  inLanguage: "es-PE",
  publisher: { "@id": ORG_ID },
};

/**
 * The same business, said the way Google Business Profile understands it.
 *
 * A service-area business, not a shop: FoodFlow is run remotely from Lima and
 * no restaurant owner is going to walk in, so there is `areaServed` and a
 * `serviceArea` radius but deliberately NO street address. Inventing one to
 * chase a map pin is the single fastest way to get a Business Profile
 * suspended, and the suspension is what kills local rankings.
 *
 * `priceRange` is the coarse "$$" band Google expects here — the actual
 * figures live in the Offer blocks, where they can be exact.
 *
 * Not stated, because it would be invented: `openingHoursSpecification`.
 * Add it here the day the hours in the Business Profile are decided, and use
 * the same hours in both places.
 */
const localBusiness = {
  // A LocalBusiness by Google's reading, a ProfessionalService by what it
  // actually sells. Both are valid; the Wikidata link pins "software company"
  // for the engines that resolve it.
  "@type": ["LocalBusiness", "ProfessionalService"],
  "@id": BUSINESS_ID,
  additionalType: "https://www.wikidata.org/wiki/Q1058914",
  name: SITE_NAME,
  url: BASE,
  description: ORG_DESCRIPTION,
  email: CONTACT_EMAIL,
  telephone: `+${WHATSAPP_NUMBER}`,
  image: `${BASE}/opengraph-image`,
  logo: `${BASE}/icon.svg`,
  priceRange: "$$",
  currenciesAccepted: "PEN",
  paymentAccepted: "Transferencia bancaria, Yape, Plin, tarjeta",
  // City and country only. Google accepts a locality-level address on a
  // service-area business; a street it cannot verify is what triggers review.
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lima",
    addressRegion: "Lima",
    addressCountry: "PE",
  },
  areaServed: [
    { "@type": "City", name: "Lima" },
    { "@type": "Country", name: "Perú" },
  ],
  // ~30 km from the historic centre reaches Miraflores, San Isidro, Surco,
  // Barranco, La Molina, San Miguel and Callao — the whole serviceable metro.
  serviceArea: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: LIMA.lat,
      longitude: LIMA.lng,
    },
    geoRadius: 30000,
  },
  knowsLanguage: ["es-PE", "en"],
  parentOrganization: { "@id": ORG_ID },
  makesOffer: { "@id": APP_ID },
  ...ratingProps(),
};

/**
 * The product. Prices come straight off the plan list the chat and the
 * pricing page render, so the three figures are written down once.
 */
function softwareApplication() {
  const plans = es.chat.plans.items;
  const amounts = plans.map((p) => Number(p.price.replace(/[^\d]/g, "")));

  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    url: BASE,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Restaurant Management Software",
    operatingSystem: "Web",
    inLanguage: ["es", "en"],
    description: es.landing.hero.sub,
    featureList: ["menu", "room", "team", "web", "bookings"].map((key) => es.landing.modules[key].title),
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PEN",
      lowPrice: Math.min(...amounts),
      highPrice: Math.max(...amounts),
      offerCount: plans.length,
      availableDeliveryMethod: "http://purl.org/goodrelations/v1#DirectDownload",
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        description: plan.tagline,
        price: Number(plan.price.replace(/[^\d]/g, "")),
        priceCurrency: "PEN",
        url: `${BASE}/precios`,
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Country", name: "PE" },
      })),
    },
    ...ratingProps(),
  };
}

/** Home page: org + site + product in one graph. */
export function HomeJsonLd() {
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [organization, localBusiness, website, softwareApplication()],
      }}
    />
  );
}

/**
 * The FAQ block, verbatim from the dictionary. Every question here is
 * visible on /preguntas — Google drops (and can penalise) FAQ markup whose
 * answers are not on the page.
 */
export function FaqJsonLd() {
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        // The Organization travels with the FAQ so `publisher` resolves to a
        // node that is actually in the document, not a dangling @id.
        "@graph": [
          organization,
          {
            "@type": "FAQPage",
            "@id": `${BASE}/preguntas#faq`,
            inLanguage: "es-PE",
            publisher: { "@id": ORG_ID },
            mainEntity: es.faq.items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ],
      }}
    />
  );
}

/** Pricing page: the three plans as a standalone product offer. */
export function PricingJsonLd() {
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [organization, localBusiness, softwareApplication()],
      }}
    />
  );
}

/**
 * The commissions explainer. Two blocks, because it is two things at once:
 * an article Google can attribute to us, and a set of questions whose answers
 * are rendered open on the page — which is the condition for FAQ markup.
 *
 * Both read from the same dictionary the page renders, so an edit to the copy
 * cannot leave the markup quoting an answer that is no longer there.
 */
export function CommissionsJsonLd() {
  const c = es.commissions;
  const url = `${BASE}/comisiones-rappi-pedidosya`;

  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: c.title,
            description: c.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            about: [
              { "@type": "Thing", name: "Rappi" },
              { "@type": "Thing", name: "PedidosYa" },
              { "@type": "Thing", name: "Comisiones de delivery" },
            ],
            audience: {
              "@type": "BusinessAudience",
              name: "Restaurantes en Lima, Perú",
            },
          },
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            inLanguage: "es-PE",
            publisher: { "@id": ORG_ID },
            mainEntity: c.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ],
      }}
    />
  );
}

/** The "sell direct" guide. Same two-block shape as the commissions page. */
export function SellDirectJsonLd() {
  const c = es.sellDirect;
  const url = `${BASE}/vender-sin-comision`;

  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: c.title,
            description: c.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            about: [
              { "@type": "Thing", name: "Delivery sin comisión" },
              { "@type": "Thing", name: "Venta directa para restaurantes" },
            ],
            audience: {
              "@type": "BusinessAudience",
              name: "Restaurantes en Lima, Perú",
            },
          },
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            inLanguage: "es-PE",
            publisher: { "@id": ORG_ID },
            mainEntity: c.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ],
      }}
    />
  );
}

function ContentArticleJsonLd({ content, path, about }) {
  const url = `${BASE}${path}`;

  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: content.title,
            description: content.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            about: about.map((name) => ({ "@type": "Thing", name })),
            audience: { "@type": "BusinessAudience", name: "Restaurantes en Perú" },
          },
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            inLanguage: "es-PE",
            publisher: { "@id": ORG_ID },
            mainEntity: content.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ],
      }}
    />
  );
}

export function QrMenuJsonLd() {
  return <ContentArticleJsonLd content={es.qrMenu} path="/carta-digital-qr" about={["Carta digital con QR", "Pedidos en mesa"]} />;
}

export function RappiAlternativeJsonLd() {
  return <ContentArticleJsonLd content={es.rappiAlternative} path="/alternativa-a-rappi" about={["Alternativas a Rappi", "Canales de venta para restaurantes"]} />;
}

export function OrderingSiteJsonLd() {
  const content = {
    ...es.orderingSite,
    title: es.customSite.title,
    description: es.customSite.description,
  };
  return <ContentArticleJsonLd content={content} path="/web-de-pedidos" about={["Página web de pedidos", "Venta directa para restaurantes"]} />;
}

/**
 * Breadcrumbs for the inner pages. Two levels is all this site has, and
 * that is exactly what Google renders under the result.
 */
export function BreadcrumbJsonLd({ name, path }) {
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: BASE },
          { "@type": "ListItem", position: 2, name, item: `${BASE}${path}` },
        ],
      }}
    />
  );
}
