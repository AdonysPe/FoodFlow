import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, OrderingSiteJsonLd } from "@/components/seo/JsonLd";
import CustomSite from "@/components/sections/CustomSite";
import OrderingSite from "@/components/sections/OrderingSite";
import { Byline, PilotClosing } from "@/components/seo/Article";

export const metadata = {
  title: "Web de pedidos para restaurantes en Perú",
  description: "Tu página web de pedidos con dominio, carta y precios propios. Los pedidos llegan al mismo panel y cocina, sin comisión por pedido.",
  alternates: { canonical: "/web-de-pedidos" },
};

export default function OrderingSitePage() {
  return (
    <SiteShell>
      <OrderingSiteJsonLd />
      <BreadcrumbJsonLd name="Web de pedidos" path="/web-de-pedidos" />
      <CustomSite as="h1" />
      {/* The hero here is the product's, not ArticleHero, so the author and
          date that the Article markup declares are shown right after it. */}
      <div className="lb-pr-block">
        <Byline path="/web-de-pedidos" />
      </div>
      <OrderingSite />
      <PilotClosing />
    </SiteShell>
  );
}
