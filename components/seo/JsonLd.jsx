import { dictionaries } from "@/lib/i18n/dictionaries";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/contact";
import { SOCIAL_LINKS } from "@/lib/social";
import {
  ORG_DESCRIPTION,
  REVIEWS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  FOUNDER,
  GUIDE_DATES,
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
const PERSON_ID = `${BASE}/nosotros#adonys`;

/**
 * The founder, as the author of every guide. Same @id everywhere, so Google
 * joins the byline on each guide, the Organization's founder and /nosotros
 * into one person. Details live in lib/seo.js (FOUNDER).
 */
const person = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: FOUNDER.name,
  jobTitle: FOUNDER.jobTitle,
  url: FOUNDER.url,
  image: FOUNDER.image,
  worksFor: { "@id": ORG_ID },
};

/** datePublished / dateModified for a guide, the same dates its byline shows. */
function articleDates(path) {
  const dates = GUIDE_DATES[path];
  return dates ? { datePublished: dates.published, dateModified: dates.modified } : {};
}

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
  // The PNG render of the mark (app/apple-icon.jsx). Google wants a raster
  // logo of at least 112 px; the tab favicon is SVG and does not qualify.
  logo: {
    "@type": "ImageObject",
    url: `${BASE}/apple-icon`,
    width: 180,
    height: 180,
  },
  description: ORG_DESCRIPTION,
  founder: { "@type": "Person", "@id": PERSON_ID, name: FOUNDER.name },
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

/*
 * No LocalBusiness / ProfessionalService node, on purpose (SEO audit,
 * 2026-11-15). FoodFlow is software run remotely from Lima: there is no
 * premises a restaurant owner walks into, and a LocalBusiness block with a
 * "$$" price range and a 30 km radius describes a shop, not a SaaS. It also
 * duplicated the Organization node (same name, phone, email). Who we are and
 * where we sell lives in `organization` (areaServed: Lima, plus the contact
 * point); what we sell lives in `softwareApplication`.
 *
 * Bring a LocalBusiness back only together with a real Google Business
 * Profile, and only if the business qualifies for one (in-person visits, a
 * verifiable address) - never with an invented street.
 */

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
    // What it does, in the plain words of the marquee on the home page
    // ("Carta con QR", "Pantalla de cocina"…), not the module headlines,
    // which are slogans and say nothing out of context.
    featureList: es.landing.marquee,
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PEN",
      lowPrice: Math.min(...amounts),
      highPrice: Math.max(...amounts),
      offerCount: plans.length,
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        description: plan.tagline,
        price: Number(plan.price.replace(/[^\d]/g, "")),
        priceCurrency: "PEN",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: Number(plan.price.replace(/[^\d]/g, "")),
          priceCurrency: "PEN",
          valueAddedTaxIncluded: true,
          unitCode: "MON",
        },
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
        "@graph": [organization, website, softwareApplication()],
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
        "@graph": [organization, softwareApplication()],
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
          person,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: c.title,
            description: c.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": PERSON_ID },
            ...articleDates(new URL(url).pathname),
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
          person,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: c.title,
            description: c.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": PERSON_ID },
            ...articleDates(new URL(url).pathname),
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
          person,
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: content.title,
            description: content.description,
            inLanguage: "es-PE",
            url,
            mainEntityOfPage: url,
            author: { "@id": PERSON_ID },
            ...articleDates(new URL(url).pathname),
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

export function ComandaJsonLd() {
  return <ContentArticleJsonLd content={es.comandaGuide} path="/comanda-digital" about={["Comanda digital", "Toma de pedidos en restaurantes"]} />;
}

export function KitchenJsonLd() {
  return <ContentArticleJsonLd content={es.kitchenGuide} path="/pantalla-de-cocina" about={["Pantalla de cocina", "Kitchen display system"]} />;
}

export function TablesJsonLd() {
  return <ContentArticleJsonLd content={es.tablesGuide} path="/mesas-y-reservas" about={["Plano de mesas", "Reservas de restaurante"]} />;
}

/**
 * The pillar page. Its answers quote the plan prices through {carta} /
 * {servicio} / {negocio}, so they are filled here exactly as the page fills
 * them — the FAQ markup has to say what the visitor reads.
 */
export function SystemJsonLd() {
  const [carta, servicio, negocio] = es.chat.plans.items.map((plan) => plan.price);
  const prices = { carta, servicio, negocio };
  const content = {
    ...es.systemGuide,
    faq: es.systemGuide.faq.map((item) => ({
      q: item.q,
      a: item.a.replace(/\{(carta|servicio|negocio)\}/g, (_, key) => prices[key]),
    })),
  };
  return <ContentArticleJsonLd content={content} path="/sistema-para-restaurantes" about={["Sistema para restaurantes", "Software para restaurantes en Perú"]} />;
}

/**
 * /calculadora as what it is: a free web tool, not an article. Name and
 * description are the page's own (dictionary), the price is 0 and no account
 * is needed — the same promise the page makes ("Sin registrarte"). Linked to
 * the founder and the Organization by @id like the guides, so the one free
 * tool on the site counts toward the same brand.
 */
export function CalculatorJsonLd() {
  const c = es.calculator;
  const url = `${BASE}/calculadora`;
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          person,
          {
            "@type": "WebApplication",
            "@id": `${url}#app`,
            name: c.eyebrow,
            alternateName: c.title,
            description: c.description,
            url,
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Calculadora de comisiones de delivery",
            operatingSystem: "Web",
            browserRequirements: "Requiere JavaScript",
            inLanguage: "es-PE",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "PEN" },
            about: [
              { "@type": "Thing", name: "Rappi" },
              { "@type": "Thing", name: "PedidosYa" },
              { "@type": "Thing", name: "Comisiones de delivery" },
            ],
            audience: { "@type": "BusinessAudience", name: "Restaurantes en Lima, Perú" },
            author: { "@id": PERSON_ID },
            publisher: { "@id": ORG_ID },
            isPartOf: { "@id": SITE_ID },
          },
        ],
      }}
    />
  );
}

/** The pilot page. Its first answer quotes the plan prices, filled as on the page. */
export function PilotJsonLd() {
  const [carta, servicio, negocio] = es.chat.plans.items.map((plan) => plan.price);
  const prices = { carta, servicio, negocio };
  const content = {
    ...es.pilotGuide,
    faq: es.pilotGuide.faq.map((item) => ({
      q: item.q,
      a: item.a.replace(/\{(carta|servicio|negocio)\}/g, (_, key) => prices[key]),
    })),
  };
  return <ContentArticleJsonLd content={content} path="/piloto" about={["Implementación de software para restaurantes", "Piloto en Lima"]} />;
}

/**
 * /nosotros: an AboutPage whose subject is the founder, the same Person the
 * guides name as author. This is the page their bylines link to.
 */
export function AboutJsonLd() {
  const url = `${BASE}/nosotros`;
  return (
    <Script
      schema={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          person,
          {
            "@type": "AboutPage",
            "@id": `${url}#page`,
            url,
            name: es.about.title,
            inLanguage: "es-PE",
            isPartOf: { "@id": SITE_ID },
            about: { "@id": ORG_ID },
            mainEntity: { "@id": PERSON_ID },
          },
        ],
      }}
    />
  );
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
