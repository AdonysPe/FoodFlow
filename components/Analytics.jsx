"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_EVENT, hasAnalyticsConsent } from "@/lib/consent";

/**
 * Loads GA4 only when the visitor has accepted analytics cookies — the
 * promise made in the cookie banner and in the Cookie/Privacy policies
 * ("solo se activará si aceptas este aviso"). Never rendered server-side:
 * consent lives in localStorage, so the safe default before hydration is off.
 */
export default function Analytics({ measurementId }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasAnalyticsConsent());
    const onChange = () => setAllowed(hasAnalyticsConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(measurementId)}, { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
