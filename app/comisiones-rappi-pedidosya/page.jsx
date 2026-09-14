import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, CommissionsJsonLd } from "@/components/seo/JsonLd";
import Commissions from "@/components/sections/Commissions";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

// The slug names both apps because that is how the question gets typed. It is
// the lowest-competition query this site can realistically win in Peru, and
// the page answers it before it pitches anything.
export const metadata = {
  title: "Cuánto cobran Rappi y PedidosYa en Perú",
  description:
    "Cuánto se llevan Rappi y PedidosYa de cada pedido en Perú, qué cobros no salen en ese porcentaje y qué puedes hacer. Con un ejemplo en soles.",
  alternates: { canonical: "/comisiones-rappi-pedidosya" },
};

export default function CommissionsPage() {
  return (
    <SiteShell>
      <CommissionsJsonLd />
      <BreadcrumbJsonLd
        name="Comisiones de Rappi y PedidosYa"
        path="/comisiones-rappi-pedidosya"
      />
      <Commissions as="h1" />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
