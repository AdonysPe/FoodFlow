import MotionProvider from "@/components/MotionProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ChatProvider } from "@/components/chat/ChatContext";
import ChatWidget from "@/components/chat/ChatWidget";
import IntroOverlay from "@/components/IntroOverlay";
import ScrollProgress from "@/components/ui/ScrollProgress";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Features from "@/components/sections/Features";
import Showcase from "@/components/sections/Showcase";
import CustomSite from "@/components/sections/CustomSite";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <LanguageProvider>
      <MotionProvider>
        <ChatProvider>
          <IntroOverlay />
          <ScrollProgress />
          <Navbar />
          <main id="main" className="relative">
            <Hero />
            <Marquee />
            <Features />
            <Showcase />
            <CustomSite />
            <CTA />
          </main>
          <Footer />
          <ChatWidget />
        </ChatProvider>
      </MotionProvider>
    </LanguageProvider>
  );
}
