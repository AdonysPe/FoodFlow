import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, YapeJsonLd } from "@/components/seo/JsonLd";
import PracticalGuide from "@/components/sections/PracticalGuide";
import { PilotClosing } from "@/components/seo/Article";
import { withSocial } from "@/lib/seo";

export const metadata = withSocial({
  title: "Cobrar con Yape y Plin en un restaurante",
  description: "Cómo cobrar con Yape y Plin en tu restaurante: límites y comisiones a revisar, capturas falsas y qué pasa con la boleta.",
  alternates: { canonical: "/yape-plin-restaurantes" },
});

export default function Page() {
  return (
    <SiteShell>
      <YapeJsonLd />
      <BreadcrumbJsonLd name="Yape y Plin" path="/yape-plin-restaurantes" />
      <PracticalGuide as="h1" contentKey="yapeGuide" path="/yape-plin-restaurantes" />
      <PilotClosing />
    </SiteShell>
  );
}
