"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const ChatWidget = lazy(() => import("@/components/chat/ChatWidget"));
const WhatsAppFab = lazy(() => import("@/components/lead/WhatsAppFab"));
const LeadFormModal = lazy(() => import("@/components/lead/LeadFormModal"));
const ExitIntent = lazy(() => import("@/components/lead/ExitIntent"));
const CookieBanner = lazy(() => import("@/components/CookieBanner"));

/**
 * Conversion helpers are useful after the page is interactive, but none of
 * them contributes to the first paint. Mounting them during idle time keeps
 * their code and hydration work away from the hero's critical path.
 */
export default function DeferredMarketingWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1400 });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <ChatWidget />
      <WhatsAppFab />
      <LeadFormModal />
      <ExitIntent />
      <CookieBanner />
    </Suspense>
  );
}
