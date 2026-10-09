"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import MotionProvider from "@/components/MotionProvider";
import { ChatProvider } from "@/components/chat/ChatContext";
import { LeadCaptureProvider } from "@/components/lead/LeadCaptureContext";
import DeferredMarketingWidgets from "@/components/DeferredMarketingWidgets";
import IntroOverlay from "@/components/IntroOverlay";
import PageTransition from "@/components/PageTransition";
import ScrollProgress from "@/components/ui/ScrollProgress";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { lbFontClasses } from "@/components/landing/lbFonts";

/**
 * Everything every page shares: language, motion, the chat, the navbar and
 * the footer. Pages supply only their own sections, so a new route is a file
 * with content in it and nothing else.
 *
 * `intro` is the load curtain, which belongs to the home page alone — on an
 * inner page it would fire on every client-side navigation and delay the
 * content people navigated to on purpose. It is pure CSS (see IntroOverlay),
 * so passing it costs nothing beyond that one extra server component.
 *
 * The theme lives above this, in the root layout, so /login and the dashboard
 * are on the same switch without going through the marketing shell.
 *
 * Every marketing page is design B ("Noche"): the shell pins the night theme,
 * loads the B type pair and brings the B header and footer, so a page only
 * supplies its own sections.
 */
export default function SiteShell({ children, intro = false }) {
  return (
    <div data-theme="dark" className={`${lbFontClasses} lb`}>
    <LanguageProvider>
      <MotionProvider>
        <ChatProvider>
          <LeadCaptureProvider>
            {intro && <IntroOverlay />}
            <ScrollProgress />
            <LandingNav />
            <PageTransition>{children}</PageTransition>
            <LandingFooter />
            <DeferredMarketingWidgets />
          </LeadCaptureProvider>
        </ChatProvider>
      </MotionProvider>
    </LanguageProvider>
    </div>
  );
}
