import SiteShell from "@/components/SiteShell";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Features from "@/components/sections/Features";
import Showcase from "@/components/sections/Showcase";
import CustomSite from "@/components/sections/CustomSite";
import About from "@/components/sections/About";
import LeadCapture from "@/components/sections/LeadCapture";
import CTA from "@/components/sections/CTA";

export default function Page() {
  return (
    <SiteShell intro>
      <Hero />
      <Marquee />
      <Features />
      <Showcase />
      <CustomSite />
      <About />
      <LeadCapture />
      <CTA />
    </SiteShell>
  );
}
