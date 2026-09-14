import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, SellDirectJsonLd } from "@/components/seo/JsonLd";
import SellDirect from "@/components/sections/SellDirect";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

// Pairs with /comisiones-rappi-pedidosya: that page is the diagnosis, this one
// is what to do about it. They link to each other in both directions.
export const metadata = {
  title: "Cómo vender delivery sin pagar comisión",
  description:
    "Los canales propios que puedes abrir, cómo cobrar sin perder el 30%, quién reparte y cuándo sigue conviniendo estar en Rappi o PedidosYa.",
  alternates: { canonical: "/vender-sin-comision" },
};

export default function SellDirectPage() {
  return (
    <SiteShell>
      <SellDirectJsonLd />
      <BreadcrumbJsonLd
        name="Vender sin comisión"
        path="/vender-sin-comision"
      />
      <SellDirect as="h1" />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
