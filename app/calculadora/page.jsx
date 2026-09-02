import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Calculator from "@/components/sections/Calculator";
import CustomSite from "@/components/sections/CustomSite";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Calculadora de comisiones",
  description:
    "Cuánto te cuestan al mes y al año las comisiones de las apps de delivery, con tus propios números. Sin registrarte: el resultado aparece mientras escribes.",
  alternates: { canonical: "/calculadora" },
};

export default function CalculatorPage() {
  return (
    <SiteShell>
      <BreadcrumbJsonLd name="Calculadora de comisiones" path="/calculadora" />
      <Calculator />
      {/* the answer to the number they just saw: their own ordering site */}
      <CustomSite />
      <CTA />
    </SiteShell>
  );
}
