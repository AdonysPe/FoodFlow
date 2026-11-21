import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, ClaimsGuideJsonLd } from "@/components/seo/JsonLd";
import PracticalGuide from "@/components/sections/PracticalGuide";
import { PilotClosing } from "@/components/seo/Article";
import { withSocial } from "@/lib/seo";

export const metadata = withSocial({
  title: "Libro de Reclamaciones para restaurantes: qué exige la ley",
  description: "Qué exige la ley a un restaurante: libro físico o virtual, aviso visible y respuesta en 15 días hábiles. Guía práctica con las reglas de Indecopi.",
  alternates: { canonical: "/libro-de-reclamaciones-restaurantes" },
});

export default function Page() {
  return (
    <SiteShell>
      <ClaimsGuideJsonLd />
      <BreadcrumbJsonLd name="Libro de Reclamaciones para restaurantes" path="/libro-de-reclamaciones-restaurantes" />
      <PracticalGuide as="h1" contentKey="reclamosGuide" path="/libro-de-reclamaciones-restaurantes" />
      <PilotClosing />
    </SiteShell>
  );
}
