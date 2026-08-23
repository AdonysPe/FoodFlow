import MotionProvider from "@/components/MotionProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import ScrollProgress from "@/components/ui/ScrollProgress";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import SocialProof from "@/components/sections/SocialProof";
import Features from "@/components/sections/Features";
import Showcase from "@/components/sections/Showcase";
import HowItWorks from "@/components/sections/HowItWorks";
import Benefits from "@/components/sections/Benefits";
import CustomSite from "@/components/sections/CustomSite";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <LanguageProvider>
      <MotionProvider>
        <ScrollProgress />
        <Navbar />
        <main id="main" className="relative">
          <Hero />
          <SocialProof />
          <Features />
          <Showcase />
          <HowItWorks />
          <Benefits />
          <CustomSite />
          <CTA />
        </main>
        <Footer />
      </MotionProvider>
    </LanguageProvider>
  );
}
