import SiteShell from "@/components/SiteShell";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Showcase from "@/components/sections/Showcase";
import Features from "@/components/sections/Features";
import LandingPage from "@/components/landing/LandingPage";
import LandingCardMotion from "@/components/landing/LandingCardMotion";


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
    <SiteShell intro>
        <HomeJsonLd />
        <LandingCardMotion />
        <Hero />
        <Marquee />
        <Showcase />
        <Features />
        <LandingPage />
      </SiteShell>
  );
}
