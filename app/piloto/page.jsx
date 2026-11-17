import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, PilotJsonLd } from "@/components/seo/JsonLd";
import PilotGuide from "@/components/sections/PilotGuide";
import { PilotClosing } from "@/components/seo/Article";
import { withSocial } from "@/lib/seo";

export const metadata = withSocial({
  title: "Piloto de 48 horas para restaurantes en Lima",
  description:
    "Cómo es el piloto de FoodFlow: una llamada de 20 minutos, tu carta cargada en 24 horas y tu primer turno acompañado. 7 días gratis y sin permanencia.",
  alternates: { canonical: "/piloto" },
});

export default function Page() {
  return (
    <SiteShell>
      <PilotJsonLd />
      <BreadcrumbJsonLd name="Piloto de 48 horas" path="/piloto" />
      <PilotGuide as="h1" />
      <PilotClosing />
    </SiteShell>
  );
}
