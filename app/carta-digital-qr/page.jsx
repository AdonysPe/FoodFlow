import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, QrMenuJsonLd } from "@/components/seo/JsonLd";
import QrMenu from "@/components/sections/QrMenu";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

export const metadata = {
  title: "Carta digital con QR para restaurantes",
  description: "Carta digital con QR para restaurantes de Lima: cambia precios sin reimprimir y recibe pedidos desde el navegador, sin descargar una app.",
  alternates: { canonical: "/carta-digital-qr" },
};

export default function QrMenuPage() {
  return (
    <SiteShell>
      <QrMenuJsonLd />
      <BreadcrumbJsonLd name="Carta digital con QR" path="/carta-digital-qr" />
      <QrMenu as="h1" />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
