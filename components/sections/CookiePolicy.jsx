"use client";

import LegalDoc, { LEGAL_LABELS_ES } from "@/components/sections/LegalDoc";
import { LEGAL_UPDATED } from "@/lib/legal/holder";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The cookie policy is the one legal page that follows the site language, so
// it brings the layout's labels in both.
const LABELS = {
  es: { ...LEGAL_LABELS_ES, contactTitle: "¿Dudas sobre esta política?", contactCopy: "Escríbenos y te respondemos." },
  en: {
    eyebrow: "Legal",
    tabs: { terminos: "Terms", privacidad: "Privacy", cookies: "Cookies" },
    tabsLabel: "Legal documents",
    claims: "Complaints book",
    toc: "On this page",
    tocLabel: "Document contents",
    spanishOnly: "",
    contactTitle: "Questions about this policy?",
    contactCopy: "Write to us and we will get back to you.",
  },
};

export default function CookiePolicy() {
  const { t, lang } = useLanguage();
  const page = t.cookies.page;
  const doc = {
    title: page.title,
    updated: `${page.updatedLabel}: ${LEGAL_UPDATED}`,
    intro: [page.intro],
    sections: page.sections,
  };

  return <LegalDoc doc={doc} active="cookies" labels={LABELS[lang] ?? LABELS.es} spanishOnly={false} />;
}
