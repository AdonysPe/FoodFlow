import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";
import FAQ from "@/components/sections/FAQ";
import { withSocial } from "@/lib/seo";


export const metadata = withSocial({
  // What a restaurant owner types, not the section name: "preguntas
  // frecuentes" alone tells Google nothing about what is being asked.
  title: "Preguntas sobre el sistema para restaurantes",
  description:
    "Qué pasa si se cae el internet, si hace falta comprar equipos, cómo migrar desde otro sistema, si los precios llevan IGV y qué ocurre si te vas.",
  alternates: { canonical: "/preguntas" },
});

/**
 * /preguntas, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page with the B header and footer; the page is pinned to the night
 * design. The closing call (chat and WhatsApp) lives in the FAQ itself.
 */
export default function FaqPage() {
  return (
    <SiteShell>
        <FaqJsonLd />
        <BreadcrumbJsonLd name="Preguntas frecuentes" path="/preguntas" />
        <FAQ as="h1" />
      </SiteShell>
  );
}
