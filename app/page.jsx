import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import SiteShell from "@/components/SiteShell";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import LandingHero from "@/components/landing/LandingHero";
import LandingMarquee from "@/components/landing/LandingMarquee";
import LandingFlow from "@/components/landing/LandingFlow";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingShowcase from "@/components/landing/LandingShowcase";
import LandingOffer from "@/components/landing/LandingOffer";
import LandingCustomSite from "@/components/landing/LandingCustomSite";
import LandingLeadCapture from "@/components/landing/LandingLeadCapture";
import LandingCTA from "@/components/landing/LandingCTA";
import "./landing-b.css";

// The B design's type pair, loaded for the home page alone. The wrapper
// below re-points the theme's font roles to them (see landing-b.css), so
// every other route keeps the site's current faces untouched.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-lb-display",
  display: "swap",
});
const text = Geist({
  subsets: ["latin"],
  variable: "--font-lb-text",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-lb-mono",
  display: "swap",
});

// Title and description live in the root layout (this page is the default
// for both); the canonical does not inherit, so it is declared here rather
// than in the layout, where /login and /dashboard would pick it up too.
export const metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home page, B design ("Noche"). Same shell (navbar, footer, chat, WhatsApp,
 * lead modal, cookie banner, intro curtain) and the same anchors the rest of
 * the site links to — #features, #product, #customer-site, #contacto, #cta —
 * so every existing link and flow lands where it did. The sections are the
 * B versions in components/landing/; the originals in components/sections/
 * are left as they were, and the shared ones (LeadCapture, CTA) keep serving
 * the other pages.
 */
export default function Page() {
  return (
    <div className={`${display.variable} ${text.variable} ${mono.variable} landing-b`}>
      <SiteShell intro>
        <HomeJsonLd />
        <LandingHero />
        <LandingMarquee />
        <LandingFlow />
        <LandingFeatures />
        <LandingShowcase />
        <LandingOffer />
        <LandingCustomSite />
        <LandingLeadCapture />
        <LandingCTA />
      </SiteShell>
    </div>
  );
}
