import SiteShell from "@/components/SiteShell";
import LandingCardMotion from "@/components/landing/LandingCardMotion";
import { BreadcrumbJsonLd, ComandaJsonLd } from "@/components/seo/JsonLd";
import ComandaGuide from "@/components/sections/ComandaGuide";
import { PilotClosing } from "@/components/seo/Article";

export const metadata = {
  title: "Comanda digital para restaurantes en Lima",
  description: "El mozo toma el pedido en su celular y llega a la pantalla de cocina al instante. Comanda digital para restaurantes de Lima, sin comisión por pedido.",
  alternates: { canonical: "/comanda-digital" },
};

// LandingCardMotion runs the home page's demos only while they are on screen.
export default function Page() {
  return (
    <SiteShell>
      <ComandaJsonLd />
      <BreadcrumbJsonLd name="Comanda digital" path="/comanda-digital" />
      <LandingCardMotion />
      <ComandaGuide as="h1" />
      <PilotClosing />
    </SiteShell>
  );
}
