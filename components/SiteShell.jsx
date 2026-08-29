"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import MotionProvider from "@/components/MotionProvider";
import { ChatProvider } from "@/components/chat/ChatContext";
import { LeadCaptureProvider } from "@/components/lead/LeadCaptureContext";
import LeadFormModal from "@/components/lead/LeadFormModal";
import WhatsAppFab from "@/components/lead/WhatsAppFab";
import ExitIntent from "@/components/lead/ExitIntent";
import ChatWidget from "@/components/chat/ChatWidget";
import CookieBanner from "@/components/CookieBanner";
import IntroOverlay from "@/components/IntroOverlay";
import PageTransition from "@/components/PageTransition";
import ScrollProgress from "@/components/ui/ScrollProgress";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";

/**
 * Everything every page shares: language, motion, the chat, the navbar and
 * the footer. Pages supply only their own sections, so a new route is a file
 * with content in it and nothing else.
 *
 * `intro` is the load curtain, which belongs to the home page alone — on an
 * inner page it would fire on every visit and delay the content people
 * navigated to on purpose.
 */
export default function SiteShell({ children, intro = false }) {
  return (
    <LanguageProvider>
      <MotionProvider>
        <ChatProvider>
          <LeadCaptureProvider>
            {intro && <IntroOverlay />}
            <ScrollProgress />
            <Navbar />
            <PageTransition>{children}</PageTransition>
            <Footer />
            <ChatWidget />
            <WhatsAppFab />
            <LeadFormModal />
            <ExitIntent />
            <CookieBanner />
          </LeadCaptureProvider>
        </ChatProvider>
      </MotionProvider>
    </LanguageProvider>
  );
}
