import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import SiteShell from "@/components/SiteShell";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Showcase from "@/components/sections/Showcase";
import Features from "@/components/sections/Features";
import LandingNav from "@/components/landing/LandingNav";
import LandingPage from "@/components/landing/LandingPage";
import LandingFooter from "@/components/landing/LandingFooter";

// The B design's type pair, loaded for the home page alone. The wrapper
// below re-points the theme's font roles to them (the `.lb` block at the end of globals.css), so every
// other route keeps the site's current faces untouched.
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
 * Home page, design B ("Noche"), as approved in the prototype. It keeps the
 * shared shell — chat, WhatsApp button, lead form, exit intent, cookie
 * banner, intro curtain — and brings its own header and footer.
 *
 * data-theme="dark" pins the page to the night design whatever theme the
 * visitor chose elsewhere; the rest of the site still follows their choice.
 */
export default function Page() {
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb`}>
      <SiteShell intro navbar={<LandingNav />} footer={<LandingFooter />}>
        <HomeJsonLd />
        <Hero />
        <Marquee />
        <Showcase />
        <Features />
        <LandingPage />
      </SiteShell>
    </div>
  );
}
