import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, BoletaJsonLd } from "@/components/seo/JsonLd";
import PracticalGuide from "@/components/sections/PracticalGuide";
import { PilotClosing } from "@/components/seo/Article";
import { withSocial } from "@/lib/seo";

export const metadata = withSocial({
  title: "Boleta electrónica para restaurantes en Perú",
  description: "Cuándo un restaurante en Perú debe emitir boleta electrónica, qué cambió en 2026 y qué hace, y qué todavía no, FoodFlow con tus comprobantes.",
  alternates: { canonical: "/boleta-electronica-restaurantes" },
});

export default function Page() {
  return (
    <SiteShell>
      <BoletaJsonLd />
      <BreadcrumbJsonLd name="Boleta electrónica" path="/boleta-electronica-restaurantes" />
      <PracticalGuide as="h1" contentKey="boletaGuide" path="/boleta-electronica-restaurantes" />
      <PilotClosing />
    </SiteShell>
  );
}
