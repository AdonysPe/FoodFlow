"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import MotionProvider from "@/components/MotionProvider";
import { ChatProvider } from "@/components/chat/ChatContext";
import { LeadCaptureProvider } from "@/components/lead/LeadCaptureContext";
import DeferredMarketingWidgets from "@/components/DeferredMarketingWidgets";
import PageTransition from "@/components/PageTransition";
import ScrollProgress from "@/components/ui/ScrollProgress";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";

/**
 * Everything every page shares: language, motion, the chat, the navbar and
 * the footer. Pages supply only their own sections, so a new route is a file
 * with content in it and nothing else.
 *
 * The theme lives above this, in the root layout, so /login and the dashboard
 * are on the same switch without going through the marketing shell.
 */
export default function SiteShell({ children }) {
  return (
    <LanguageProvider>
      <MotionProvider>
        <ChatProvider>
          <LeadCaptureProvider>
            <ScrollProgress />
            <Navbar />
            <PageTransition>{children}</PageTransition>
            <Footer />
            <DeferredMarketingWidgets />
          </LeadCaptureProvider>
        </ChatProvider>
      </MotionProvider>
    </LanguageProvider>
  );
}
