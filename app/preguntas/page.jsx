import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";
import FAQ from "@/components/sections/FAQ";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

// The B design's type pair, as on the home page: loaded for this route only,
// and re-pointed to the theme's font roles by the `.lb` block at the end of
// globals.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

export const metadata = {
  title: "Preguntas frecuentes",
  description:
    "Qué pasa si se cae el internet, si hace falta comprar equipos, cómo migrar desde otro sistema, si los precios llevan IGV y qué ocurre si te vas.",
  alternates: { canonical: "/preguntas" },
};

/**
 * /preguntas, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page with the B header and footer; the page is pinned to the night
 * design. The closing call (chat and WhatsApp) lives in the FAQ itself.
 */
export default function FaqPage() {
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb`}>
      <SiteShell navbar={<LandingNav />} footer={<LandingFooter />}>
        <FaqJsonLd />
        <BreadcrumbJsonLd name="Preguntas frecuentes" path="/preguntas" />
        <FAQ as="h1" />
      </SiteShell>
    </div>
  );
}
