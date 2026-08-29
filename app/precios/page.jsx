import SiteShell from "@/components/SiteShell";
import Pricing from "@/components/sections/Pricing";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Precios",
  description:
    "Tres planes sin comisión por pedido, desde S/ 79 al mes. Usuarios y locales adicionales, y la migración de tu carta incluida en el piloto de Lima.",
  alternates: { canonical: "/precios" },
};

export default function PricingPage() {
  return (
    <SiteShell>
      <Pricing />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
