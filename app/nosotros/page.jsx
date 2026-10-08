import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import About from "@/components/sections/About";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

// The B design's type pair, as on the home page: loaded for this route only,
// and re-pointed to the theme's font roles by the `.lb` block at the end of
// globals.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

export const metadata = {
  title: "Quiénes somos",
  description:
    "Quién está detrás de FoodFlow y por qué existe: una persona en Lima que vio a un restaurante perder pedidos entre un cuaderno y tres chats de WhatsApp.",
  alternates: { canonical: "/nosotros" },
};

/**
 * /nosotros, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page with the B header and footer; the page is pinned to the night
 * design. The closing call lives in the About section itself.
 */
export default function AboutPage() {
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb`}>
      <SiteShell navbar={<LandingNav />} footer={<LandingFooter />}>
        <BreadcrumbJsonLd name="Quiénes somos" path="/nosotros" />
        <About as="h1" />
      </SiteShell>
    </div>
  );
}
