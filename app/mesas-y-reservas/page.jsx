import SiteShell from "@/components/SiteShell";
import LandingCardMotion from "@/components/landing/LandingCardMotion";
import { BreadcrumbJsonLd, TablesJsonLd } from "@/components/seo/JsonLd";
import TablesGuide from "@/components/sections/TablesGuide";
import { PilotClosing } from "@/components/seo/Article";
import { withSocial } from "@/lib/seo";

export const metadata = withSocial({
  title: "Plano de mesas y reservas para restaurantes",
  description: "Plano de mesas en vivo y reservas para restaurantes de Lima: qué mesa está libre, ocupada o reservada, y las reservas del día y de la semana.",
  alternates: { canonical: "/mesas-y-reservas" },
});

// LandingCardMotion runs the home page's demos only while they are on screen.
export default function Page() {
  return (
    <SiteShell>
      <TablesJsonLd />
      <BreadcrumbJsonLd name="Mesas y reservas" path="/mesas-y-reservas" />
      <LandingCardMotion />
      <TablesGuide as="h1" />
      <PilotClosing />
    </SiteShell>
  );
}
