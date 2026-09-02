import { dictionaries } from "@/lib/i18n/dictionaries";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/contact";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

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
 * Note what is deliberately absent: `aggregateRating` and `review`. FoodFlow
 * has no customers yet, and inventing stars is both a policy violation and
 * the fastest way to lose a restaurant owner who checks.
 */

const BASE = SITE_URL;
const es = dictionaries.es;

const ORG_ID = `${BASE}/#organization`;
const SITE_ID = `${BASE}/#website`;
const APP_ID = `${BASE}/#software`;

function Script({ schema }) {
  return (
    <script
      type="application/ld+json"
      // The payload is our own dictionary, not user input. `<` is still
      // escaped so a stray character in the copy can never close the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\u003c"),
      }}
    />
  );
}

/** Who we are. Referenced by @id from every other block, so it is stated once. */
const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: BASE,
  email: CONTACT_EMAIL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE}/icon.svg`,
  },
  description: SITE_DESCRIPTION,
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
    description: es.hero.subheadline,
    featureList: es.features.items.map((f) => f.title),
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
        "@type": "FAQPage",
        "@id": `${BASE}/preguntas#faq`,
        inLanguage: "es-PE",
        publisher: { "@id": ORG_ID },
        mainEntity: es.faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
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
