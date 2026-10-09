import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import About from "@/components/sections/About";


export const metadata = {
  title: "Quiénes somos",
  description:
    "Quién está detrás de FoodFlow y por qué existe: una persona en Lima que vio a un restaurante perder pedidos entre un cuaderno y tres chats de WhatsApp.",
  alternates: { canonical: "/nosotros" },
};

/**
 * /nosotros, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page with the B header and footer; the page is pinned to the night
 * design. The closing call lives in the About section itself.
 */
export default function AboutPage() {
  return (
    <SiteShell>
        <BreadcrumbJsonLd name="Quiénes somos" path="/nosotros" />
        <About as="h1" />
      </SiteShell>
  );
}
