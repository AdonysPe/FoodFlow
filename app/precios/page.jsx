import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, PricingJsonLd } from "@/components/seo/JsonLd";
import Pricing from "@/components/sections/Pricing";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

// The B design's type pair, as on the home page: loaded for this route only,
// and re-pointed to the theme's font roles by the `.lb` block at the end of
// globals.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

export const metadata = {
  title: "Precios",
  description:
    "Tres planes sin comisión por pedido, desde S/ 69 al mes. Usuarios y locales adicionales, y la migración de tu carta incluida en el piloto de Lima.",
  alternates: { canonical: "/precios" },
};

/**
 * /precios, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page (chat, WhatsApp button, lead form, cookie banner) with the B
 * header and footer; the page is pinned to the night design.
 */
export default function PricingPage() {
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb`}>
      <SiteShell navbar={<LandingNav />} footer={<LandingFooter />}>
        <PricingJsonLd />
        <BreadcrumbJsonLd name="Precios" path="/precios" />
        <Pricing as="h1" />
      </SiteShell>
    </div>
  );
}
