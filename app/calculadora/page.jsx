import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Calculator from "@/components/sections/Calculator";
import CustomSite from "@/components/sections/CustomSite";
import CTA from "@/components/sections/CTA";

export const metadata = {
  // The brands belong in the title because they are what gets typed: "cuánto
  // cobra Rappi de comisión" is the lowest-difficulty query this site can win.
  title: "Calculadora de comisiones de Rappi y PedidosYa",
  description:
    "Cuánto te cuestan al mes y al año las comisiones de Rappi, PedidosYa y las demás apps de delivery, con tus propios números. Sin registrarte.",
  alternates: { canonical: "/calculadora" },
};

export default function CalculatorPage() {
  return (
    <SiteShell>
      <BreadcrumbJsonLd name="Calculadora de comisiones" path="/calculadora" />
      <Calculator as="h1" />
      {/* the answer to the number they just saw: their own ordering site */}
      <CustomSite />
      <CTA />
    </SiteShell>
  );
}
