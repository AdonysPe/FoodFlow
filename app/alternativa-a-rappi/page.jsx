import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, RappiAlternativeJsonLd } from "@/components/seo/JsonLd";
import RappiAlternative from "@/components/sections/RappiAlternative";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Alternativa a Rappi para restaurantes",
  description: "Compara Rappi con un canal propio: comisión, clientes, reparto, visibilidad y costo. Una salida realista para restaurantes en Perú.",
  alternates: { canonical: "/alternativa-a-rappi" },
};

export default function RappiAlternativePage() {
  return (
    <SiteShell>
      <RappiAlternativeJsonLd />
      <BreadcrumbJsonLd name="Alternativa a Rappi" path="/alternativa-a-rappi" />
      <RappiAlternative as="h1" />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
