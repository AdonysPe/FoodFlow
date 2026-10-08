"use client";

import Image from "next/image";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";

const CHECK_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/** Icons for the commitment cards, in the order of `t.about.commitment`. */
const COMMITMENT_ICONS = [
  { tone: "teal", node: <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" /> },
  { tone: "zero" },
  {
    tone: "cream",
    node: (
      <>
        <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
        <path d="M5 19.5h14" />
      </>
    ),
  },
  {
    tone: "accent",
    node: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </>
    ),
  },
];

/**
 * /nosotros, design B ("Noche"), as approved in the prototype: the headline,
 * the founder's portrait and story, "that Friday" against "with FoodFlow", the
 * quote lighting up word by word, the four commitments, and the closing call.
 *
 * Copy is `t.about`. The portrait is the real photo, and the story keeps the
 * founder's own words. `as` is forwarded so /nosotros keeps the h1.
 */
export default function About({ as: Heading = "h1" }) {
  const { t } = useLanguage();
  const a = t.about;
  const { openLeadForm } = useLeadCapture();
  const whatsappUrl = buildWhatsAppUrl(a.closing.whatsappMessage);
  const [lead, ...rest] = a.body;

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section id="nosotros" className="lb-pr-hero lb-pr-hero--left">
        <div className="lb-pr-block lb-pr-block--flush">
          <p className="lb-eyebrow-accent lb-rise">{a.eyebrow}</p>
          <Heading className="lb-pr-h1">
            {a.line1.map((w, i) => (
              <span key={`a${i}`}>
                <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                  {w}
                </span>{" "}
              </span>
            ))}
            <br />
            {a.line2.map((w, i) => {
              const last = i === a.line2.length - 1;
              return (
                <span key={`b${i}`}>
                  <span className="lb-word" style={{ animationDelay: `${0.52 + i * 0.07}s`, color: "#8a8278" }}>
                    {w}
                    {last && <span style={{ color: "#ff5a33" }}>.</span>}
                  </span>
                  {last ? "" : " "}
                </span>
              );
            })}
          </Heading>
        </div>
      </section>

      {/* -------------------------------------------------------- the story */}
      <section className="lb-pr-block" style={{ paddingTop: 72 }}>
        <div className="lb-ab-story">
          <div className="lb-ab-portrait lb-rise" style={{ animationDelay: ".5s" }}>
            <div className="lb-glow lb-ab-portrait-glow" aria-hidden />
            <div className="lb-float lb-ab-photo">
              <Image
                src="/Founder.jpg"
                alt={a.photoAlt}
                width={968}
                height={1032}
                sizes="(min-width: 1024px) 440px, 90vw"
                style={{ width: "100%", height: "auto", aspectRatio: "4 / 5", objectFit: "cover", display: "block" }}
                priority
              />
            </div>
            <div className="lb-ab-caption">
              <span style={{ fontSize: 15, fontWeight: 600 }}>{a.signature}</span>
              <span style={{ fontSize: 12, lineHeight: 1.45, color: "#cfc7bb" }}>{a.photoNote}</span>
            </div>
          </div>

          <div className="lb-ab-text">
            <p className="lb-rise" style={{ margin: 0, fontSize: 22, lineHeight: 1.5, letterSpacing: "-0.01em", animationDelay: ".6s" }}>
              {lead}
            </p>
            {rest.map((paragraph, i) => (
              <p key={i} className="lb-rise" style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#b9b1a5", animationDelay: `${0.7 + i * 0.1}s` }}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------ before / with FoodFlow */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <div className="lb-row" style={{ alignItems: "stretch" }}>
          <div className="lb-reveal lb-ab-panel lb-ab-panel--dark">
            <span className="lb-eyebrow">{a.before.label}</span>
            <div className="lb-ab-mess">
              <div className="mess m1 lb-ab-note">
                <span style={{ fontWeight: 600 }}>{a.before.notebook}</span>
                {a.before.notes.map((line, i) => (
                  <span key={i} style={{ display: "block", textDecoration: i === 1 ? "line-through" : undefined }}>
                    {line}
                  </span>
                ))}
              </div>
              <div className="mess m2 lb-ab-chats">
                {a.before.chats.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              <div className="mess m3 lb-ab-tablet">
                <span className="lb-ab-battery" aria-hidden>
                  <span className="batt" />
                </span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.before.tablet}</span>
                  <span style={{ fontSize: 11, color: "#a39b90" }}>{a.before.battery}</span>
                </span>
              </div>
            </div>
            <span style={{ fontSize: 15, color: "#b9b1a5" }}>{a.before.caption}</span>
          </div>

          <div className="lb-reveal lb-ab-panel lb-ab-panel--light">
            <span className="lb-mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "#5f5a54", textTransform: "uppercase" }}>
              {a.after.label}
            </span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              {a.after.rows.map((row, i) => (
                <div key={row.tag} className={`q q${i + 1} lb-ab-row`}>
                  <span className="lb-mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 52 }}>
                    {row.tag}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{row.text}</span>
                  <span className={`lb-ab-status lb-ab-status--${i}`}>{row.status}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 15, color: "#4a4540" }}>{a.after.caption}</span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- quote */}
      <section className="lb-pr-block" style={{ paddingTop: 150 }}>
        <blockquote className="lb-ab-quote">
          <span style={{ color: "#ff5a33" }}>“</span>
          {a.quote.split(" ").map((word, i, all) => (
            <span key={i}>
              <span className="lit" style={{ animationDelay: `${i * 0.25}s` }}>
                {word}
              </span>
              {i < all.length - 1 ? " " : ""}
            </span>
          ))}
          <span style={{ color: "#ff5a33" }}>”</span>
        </blockquote>
      </section>

      {/* ------------------------------------------------------ commitments */}
      <section className="lb-pr-block" style={{ paddingTop: 150 }}>
        <h2 className="lb-reveal lb-ab-h2">
          {a.commitmentLabel}
          <span style={{ color: "#ff5a33" }}>.</span>
        </h2>
        <div className="lb-ab-cards">
          {a.commitment.map((item, i) => {
            const icon = COMMITMENT_ICONS[i];
            return (
              <div key={i} className="lb-reveal lb-ab-card">
                {icon?.tone === "zero" ? (
                  <span className="lb-display" style={{ fontSize: 44, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    0<span style={{ color: "#ff5a33" }}>%</span>
                  </span>
                ) : icon ? (
                  <span className={`lb-ab-icon lb-ab-icon--${icon.tone}`}>
                    <svg {...CHECK_PROPS}>{icon.node}</svg>
                  </span>
                ) : null}
                <span style={{ marginTop: "auto", fontSize: 17, lineHeight: 1.45 }}>{item}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------- close */}
      <section className="lb-reserve">
        <div className="lb-reserve-glow" aria-hidden />
        <h2 className="lb-h2-xl lb-reveal" style={{ fontSize: "clamp(44px, 7vw, 100px)", lineHeight: 0.95 }}>
          {a.closing.line1}
          <br />
          <span>{a.closing.line2}</span>
        </h2>
        <p className="lb-reveal" style={{ margin: "26px auto 0", maxWidth: 480, fontSize: 19, lineHeight: 1.5, color: "#b9b1a5" }}>
          {a.closing.description}
        </p>
        <div className="lb-hero-ctas lb-reveal">
          <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={() => openLeadForm({ source: "web_form" })}>
            {a.closing.cta}
          </button>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="lb-text-link" style={{ color: "#5fd6c5" }}>
              {a.closing.whatsapp}
            </a>
          )}
        </div>
      </section>
    </>
  );
}
