import SiteShell from "@/components/SiteShell";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Features from "@/components/sections/Features";
import Showcase from "@/components/sections/Showcase";
import CustomSiteSummary from "@/components/sections/CustomSiteSummary";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

// Title and description live in the root layout (this page is the default
// for both); the canonical does not inherit, so it is declared here rather
// than in the layout, where /login and /dashboard would pick it up too.
export const metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <SiteShell intro>
      <HomeJsonLd />
      <Hero />
      <Marquee />
      <Features />
      <Showcase />
      <CustomSiteSummary />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
