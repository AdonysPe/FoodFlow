import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import About from "@/components/sections/About";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Quiénes somos",
  description:
    "Quién está detrás de FoodFlow y por qué existe: una persona en Lima que vio a un restaurante perder pedidos entre un cuaderno y tres chats de WhatsApp.",
  alternates: { canonical: "/nosotros" },
};

export default function AboutPage() {
  return (
    <SiteShell>
      <BreadcrumbJsonLd name="Quiénes somos" path="/nosotros" />
      <About />
      <CTA />
    </SiteShell>
  );
}
