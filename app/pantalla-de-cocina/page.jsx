import SiteShell from "@/components/SiteShell";
import LandingCardMotion from "@/components/landing/LandingCardMotion";
import { BreadcrumbJsonLd, KitchenJsonLd } from "@/components/seo/JsonLd";
import KitchenGuide from "@/components/sections/KitchenGuide";
import { PilotClosing } from "@/components/seo/Article";

export const metadata = {
  title: "Pantalla de cocina (KDS) para restaurantes",
  description: "Pantalla de cocina para restaurantes de Lima: los pedidos del salón, del QR y de tu web en una cola, ordenados por tiempo. Funciona en cualquier tablet.",
  alternates: { canonical: "/pantalla-de-cocina" },
};

// LandingCardMotion runs the home page's demos only while they are on screen.
export default function Page() {
  return (
    <SiteShell>
      <KitchenJsonLd />
      <BreadcrumbJsonLd name="Pantalla de cocina" path="/pantalla-de-cocina" />
      <LandingCardMotion />
      <KitchenGuide as="h1" />
      <PilotClosing />
    </SiteShell>
  );
}
