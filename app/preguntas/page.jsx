import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Preguntas frecuentes",
  description:
    "Qué pasa si se cae el internet, si hace falta comprar equipos, cómo migrar desde otro sistema, si los precios llevan IGV y qué ocurre si te vas.",
  alternates: { canonical: "/preguntas" },
};

export default function FaqPage() {
  return (
    <SiteShell>
      <FaqJsonLd />
      <BreadcrumbJsonLd name="Preguntas frecuentes" path="/preguntas" />
      <FAQ />
      <CTA />
    </SiteShell>
  );
}
