"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEGAL_HOLDER } from "@/lib/legal/holder";

/**
 * Renderer shared by every legal document. The documents themselves live in
 * `lib/legal/` (and the cookie policy in the dictionaries) as structured data,
 * so the wording is versioned in one place and the presentation in another.
 *
 * Terms and privacy are Spanish only while the rest of the site is bilingual:
 * they govern a contract executed in Peru, and a second translated text would
 * be one more thing that could be read against the first. The cookie policy
 * follows the site language, so it passes its own labels.
 */
const DOCS = [
  { id: "terminos", href: "/terminos" },
  { id: "privacidad", href: "/privacidad" },
  { id: "cookies", href: "/cookies" },
];

export const LEGAL_LABELS_ES = {
  eyebrow: "Legal",
  tabs: { terminos: "Términos", privacidad: "Privacidad", cookies: "Cookies" },
  tabsLabel: "Documentos legales",
  claims: "Libro de reclamaciones",
  toc: "En esta página",
  tocLabel: "Contenido del documento",
  spanishOnly: "Solo en español: rige un contrato celebrado en el Perú.",
  contactTitle: "¿Dudas sobre este documento?",
  contactCopy: "Escríbenos antes de aceptar y lo conversamos.",
};

// "1. Quién presta el servicio" → "Quién presta el servicio": the number is
// drawn by the layout, so the stored title keeps it only for plain-text reads.
const stripNumber = (title) => title.replace(/^\d+\.\s*/, "");

function splitTitle(title) {
  const cut = title.lastIndexOf(" ");
  return cut > 0 ? [title.slice(0, cut), title.slice(cut + 1)] : ["", title];
}

export default function LegalDoc({ doc, active, labels = LEGAL_LABELS_ES, spanishOnly = true }) {
  const sections = doc.sections.map((section, i) => ({
    id: `seccion-${i + 1}`,
    num: String(i + 1).padStart(2, "0"),
    title: stripNumber(section.title),
    body: Array.isArray(section.body) ? section.body : [section.body],
  }));
  const [current, setCurrent] = useState(sections[0]?.id);
  const [lead, last] = splitTitle(doc.title);

  // Scroll spy: the section crossing the upper band of the viewport is the one
  // being read. Reading order, not visibility ratio, decides between two.
  useEffect(() => {
    const targets = [...document.querySelectorAll("[data-legal-section]")];
    if (!targets.length || typeof IntersectionObserver !== "function") return undefined;
    const inBand = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const first = targets.find((t) => inBand.has(t.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-18% 0px -68% 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [doc]);

  const go = (event, id) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setCurrent(id);
  };

  return (
    <div className="lb-legal">
      <div aria-hidden className="lb-legal-glow" />

      <section className="lb-legal-hero">
        <div className="lb-wrap">
          <p className="lb-eyebrow-accent lb-rise">
            {labels.eyebrow} · {labels.tabs[active]}
          </p>
          <h1 className="lb-pr-h1">
            {lead && (
              <>
                <span className="lb-word" style={{ animationDelay: ".05s" }}>{lead}</span>{" "}
              </>
            )}
            <span className="lb-word" style={{ animationDelay: ".16s", color: "var(--lb-mute)" }}>
              {last}
              <span style={{ color: "var(--lb-accent)" }}>.</span>
            </span>
          </h1>

          <div className="lb-legal-meta lb-rise" style={{ animationDelay: ".3s" }}>
            <span className="lb-legal-updated">
              <i aria-hidden />
              {doc.updated}
            </span>
            {spanishOnly && <span className="lb-legal-note">{labels.spanishOnly}</span>}
          </div>

          <nav className="lb-legal-tabs lb-rise" style={{ animationDelay: ".38s" }} aria-label={labels.tabsLabel}>
            {DOCS.map((d) => (
              <Link key={d.id} href={d.href} className={d.id === active ? "is-on" : undefined} aria-current={d.id === active ? "page" : undefined}>
                {labels.tabs[d.id]}
              </Link>
            ))}
            <Link href="/libro-de-reclamaciones">{labels.claims} ›</Link>
          </nav>
        </div>
      </section>

      <section className="lb-legal-body">
        <div className="lb-wrap lb-legal-cols">
          <nav className="lb-legal-toc lb-rise" style={{ animationDelay: ".45s" }} aria-label={labels.tocLabel}>
            <span className="lb-legal-toc-h">{labels.toc}</span>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={(e) => go(e, s.id)} className={s.id === current ? "is-on" : undefined} aria-current={s.id === current ? "true" : undefined}>
                <span className="lb-mono">{s.num}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </nav>

          <article className="lb-legal-article">
            <div className="lb-legal-intro lb-rise" style={{ animationDelay: ".5s" }}>
              {(Array.isArray(doc.intro) ? doc.intro : [doc.intro]).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {sections.map((s) => (
              <section key={s.id} id={s.id} data-legal-section className="lb-legal-sec lb-reveal">
                <span className="lb-legal-num lb-mono">{s.num}</span>
                <div>
                  <h2>{s.title}</h2>
                  {s.body.map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <div className="lb-legal-contact lb-reveal">
              <span className="lb-legal-contact-ico" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6.5h16v11H4z" />
                  <path d="M4.5 7l7.5 6 7.5-6" />
                </svg>
              </span>
              <div>
                <strong>{labels.contactTitle}</strong>
                <span>{labels.contactCopy}</span>
              </div>
              <a href={`mailto:${LEGAL_HOLDER.email}`} className="lb-legal-mail">
                {LEGAL_HOLDER.email}
              </a>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
