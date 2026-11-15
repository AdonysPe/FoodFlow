import SiteShell from "@/components/SiteShell";
import LandingCardMotion from "@/components/landing/LandingCardMotion";
import { BreadcrumbJsonLd, SystemJsonLd } from "@/components/seo/JsonLd";
import SystemGuide from "@/components/sections/SystemGuide";
import { PilotClosing } from "@/components/seo/Article";

export const metadata = {
  title: "Sistema para restaurantes en Lima, desde S/ 69",
  description: "Sistema para restaurantes en Lima: carta QR, comanda, pantalla de cocina, mesas y web de pedidos en un panel. Precio fijo en soles, sin comisión.",
  alternates: { canonical: "/sistema-para-restaurantes" },
};

// LandingCardMotion runs the home page's demos only while they are on screen.
export default function Page() {
  return (
    <SiteShell>
      <SystemJsonLd />
      <BreadcrumbJsonLd name="Sistema para restaurantes" path="/sistema-para-restaurantes" />
      <LandingCardMotion />
      <SystemGuide as="h1" />
      <PilotClosing />
    </SiteShell>
  );
}
