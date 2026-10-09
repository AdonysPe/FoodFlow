"use client";

import Link from "next/link";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";

/**
 * The pieces of the five guides (carta digital, web de pedidos, vender sin
 * comisión, alternativa a Rappi, comisiones), design B ("Noche"). Every guide
 * is built from the same few blocks so they read as one family and share the
 * public pages' title size: a left-aligned hero, a heading with its intro,
 * cards, a comparison table, ticks, a callout, the open questions and the
 * closing call.
 *
 * Questions are plain markup, not an accordion: they are the answers the
 * FAQPage schema declares, and Google wants them in the HTML.
 */

export function ArticleHero({ as: Heading = "h1", eyebrow, title, description }) {
  const words = title.split(" ");
  return (
    <section className="lb-pr-hero lb-pr-hero--left">
      <div className="lb-glow" aria-hidden style={{ top: 10, height: 460 }} />
      <div className="lb-pr-block">
        <p className="lb-eyebrow-accent lb-rise">{eyebrow}</p>
        <Heading className="lb-pr-h1">
          {words.map((w, i) => (
            <span key={i}>
              <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                {w}
              </span>
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
          {!/[?!.…]$/.test(title) && <span style={{ color: "#ff5a33" }}>.</span>}
        </Heading>
        {description && (
          <p className="lb-ar-lead lb-rise" style={{ animationDelay: `${0.3 + words.length * 0.06}s` }}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

/** One chapter of the guide: a block of the public pages' width. */
export function Chapter({ title, intro, children, id }) {
  return (
    <section id={id} className="lb-pr-block lb-ar-chapter">
      {title && (
        <h2 className="lb-h2 lb-ar-h2 lb-reveal">
          {title}
          <span style={{ color: "#ff5a33" }}>.</span>
        </h2>
      )}
      {intro && <p className="lb-ar-p lb-reveal">{intro}</p>}
      {children}
    </section>
  );
}

export function Cards({ children, cols = 3 }) {
  return <div className={`lb-ar-cards lb-ar-cards--${cols}`}>{children}</div>;
}

export function Card({ eyebrow, title, big, children, hl = false }) {
  return (
    <div className={`lb-ar-card lb-reveal${hl ? " is-hl" : ""}`}>
      {eyebrow && <span className="lb-mono lb-ar-card-eyebrow">{eyebrow}</span>}
      {big && <span className="lb-display lb-ar-card-big">{big}</span>}
      {title && <h3 className="lb-ar-card-title">{title}</h3>}
      {children}
    </div>
  );
}

export function CardText({ children, muted = false }) {
  return <p className={`lb-ar-card-text${muted ? " is-muted" : ""}`}>{children}</p>;
}

/** A callout with a vermilion rule ("tone" none) or a warm tint ("warn"). */
export function Callout({ title, children, tone = "rule" }) {
  return (
    <div className={`lb-ar-callout lb-reveal lb-ar-callout--${tone}`}>
      {title && <h2 className="lb-ar-callout-title">{title}</h2>}
      {children}
    </div>
  );
}

export function Checks({ items, cols = 2 }) {
  return (
    <ul className={`lb-ar-checks lb-ar-checks--${cols}`}>
      {items.map((item) => (
        <li key={item}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff7a57" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A comparison in its own scroll box, so a phone never drags the page sideways. */
export function DataTable({ head, rows, accentCol = -1, minWidth = 640 }) {
  return (
    <div className="lb-table-wrap lb-reveal lb-ar-table-wrap">
      <table className="lb-ar-table" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={i === accentCol ? "is-accent" : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className={i === accentCol ? "is-accent" : undefined}>
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Label / figure rows, the last one the total. */
export function Ledger({ rows }) {
  return (
    <dl className="lb-ar-ledger">
      {rows.map((row, i) => {
        const total = i === rows.length - 1;
        return (
          <div key={row.label} className={total ? "is-total" : undefined}>
            <dt>{row.label}</dt>
            <dd className="lb-display">{row.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Questions({ title, items }) {
  return (
    <section className="lb-pr-block lb-ar-chapter">
      <div className="lb-faq">
        <h2 className="lb-h2 lb-ar-h2 lb-reveal" style={{ flex: "1 1 280px", marginBottom: 0 }}>
          {title}
          <span style={{ color: "#ff5a33" }}>.</span>
        </h2>
        <div className="lb-faq-list lb-ar-faq">
          {items.map((item) => (
            <div key={item.q} className="lb-faq-item">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TextLinks({ links }) {
  return (
    <nav className="lb-pr-block lb-ar-links" aria-label="Más guías">
      {links.map(({ href, label }) => (
        <Link key={href} href={href}>
          {label} ›
        </Link>
      ))}
    </nav>
  );
}

export function Fine({ children }) {
  return <p className="lb-pr-block lb-ar-fine">{children}</p>;
}

/** The guide's own next step: a card with one line and one pill. */
export function NextStep({ title, body, href, button }) {
  return (
    <section className="lb-pr-block lb-ar-chapter">
      <div className="lb-ar-next lb-reveal">
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <h2 className="lb-ar-next-title">{title}</h2>
          <p className="lb-ar-p" style={{ margin: "12px 0 0" }}>
            {body}
          </p>
        </div>
        <Link href={href} className="lb-pill-btn lb-pill-btn--lg">
          {button}
        </Link>
      </div>
    </section>
  );
}

/**
 * The closing call every guide ends on: the same one as Nosotros. The pilot
 * button opens the shared lead form; WhatsApp is the other way in.
 */
export function PilotClosing() {
  const { t } = useLanguage();
  const a = t.about.closing;
  const { openLeadForm } = useLeadCapture();
  const whatsappUrl = buildWhatsAppUrl(a.whatsappMessage);

  return (
    <section className="lb-reserve">
      <div className="lb-reserve-glow" aria-hidden />
      <h2 className="lb-h2-xl lb-reveal" style={{ fontSize: "clamp(44px, 7vw, 100px)", lineHeight: 0.95 }}>
        {a.line1}
        <br />
        <span>{a.line2}</span>
      </h2>
      <p className="lb-reveal" style={{ margin: "26px auto 0", maxWidth: 480, fontSize: 19, lineHeight: 1.5, color: "#b9b1a5" }}>
        {a.description}
      </p>
      <div className="lb-hero-ctas lb-reveal">
        <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={() => openLeadForm({ source: "web_form" })}>
          {a.cta}
        </button>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="lb-text-link" style={{ color: "#5fd6c5" }}>
            {a.whatsapp}
          </a>
        )}
      </div>
    </section>
  );
}
