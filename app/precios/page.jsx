import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, PricingJsonLd } from "@/components/seo/JsonLd";
import Pricing from "@/components/sections/Pricing";


export const metadata = {
  title: "Precios",
  description:
    "Tres planes sin comisión por pedido, desde S/ 69 al mes. Usuarios y locales adicionales, y la migración de tu carta incluida en el piloto de Lima.",
  alternates: { canonical: "/precios" },
};

/**
 * /precios, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page (chat, WhatsApp button, lead form, cookie banner) with the B
 * header and footer; the page is pinned to the night design.
 */
export default function PricingPage() {
  return (
    <SiteShell>
        <PricingJsonLd />
        <BreadcrumbJsonLd name="Precios" path="/precios" />
        <Pricing as="h1" />
      </SiteShell>
  );
}
