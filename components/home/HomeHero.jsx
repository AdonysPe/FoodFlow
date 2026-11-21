"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { IconPlay } from "@/components/ui/Icons";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Its own chunk, loaded only when someone asks for the video.
const DemoVideoModal = dynamic(() => import("@/components/DemoVideoModal"), {
  ssr: false,
});

// The floor plan on the hero dashboard: occupied, asking for the bill, free.
const TABLES = ["busy", "bill", "free", "busy", "free", "busy", "busy", "free", "busy", "free", "bill", "busy"];
const BARS = [30, 46, 38, 72, 92, 64, 44, 58, 80, 100];

/**
 * Home hero. The headline resolves word by word on load (CSS only); as the
 * page scrolls the dashboard below it rises out of a tilt and the phone
 * drifts up faster than it, for depth. Both motions are scroll-driven CSS
 * (app/home.css), so the hero ships no animation JavaScript.
 *
 * "Reserva tu piloto" opens the shared lead form; "Ver el producto" opens
 * the demo video.
 */
export default function HomeHero() {
  const { t } = useLanguage();
  const { openLeadForm } = useLeadCapture();
  const [demoOpen, setDemoOpen] = useState(false);
  const l = t.landing;
  const h = l.hero;
  const d = l.scenes.device;
  const phone = l.story.phone;

  const words = [
    ...h.line1.map((w) => ({ w, muted: false })),
    ...h.line2.map((w) => ({ w, muted: true })),
  ];

  return (
    <section id="inicio" className="lh-hero">
      <div className="lh-glow" aria-hidden />
      <div className="lh-wrap lh-hero-copy">
        <p className="lh-badge lh-rise">
          <span className="lh-live" aria-hidden />
          {h.badge}
        </p>
        <h1 className="lh-h1">
          {h.line1.map((w, i) => (
            <span key={`a${i}`}>
              <span className="lh-word" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                {w}
              </span>{" "}
            </span>
          ))}
          <span className="lh-h1-muted">
            {h.line2.map((w, i) => (
              <span key={`b${i}`}>
                <span className="lh-word" style={{ animationDelay: `${0.1 + (h.line1.length + i) * 0.12}s` }}>
                  {w}
                  {i === h.line2.length - 1 && <span className="lh-accent">.</span>}
                </span>
                {i < h.line2.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
        </h1>
        <p className="lh-hero-sub lh-rise" style={{ animationDelay: `${0.2 + words.length * 0.12}s` }}>
          {h.sub}
        </p>
        <div className="lh-ctas lh-rise" style={{ animationDelay: `${0.35 + words.length * 0.12}s` }}>
          <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={() => openLeadForm({ source: "web_form" })}>
            {h.cta}
          </button>
          <button
            type="button"
            className="lb-text-link"
            onClick={() => setDemoOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={demoOpen}
          >
            {h.secondary}
            <IconPlay className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="lh-wrap">
        <div className="lh-stage3d">
          <div className="lh-device" role="img" aria-label={d.aria}>
            <div className="lh-dev-top">
              <span>
                <b>{d.place}</b> · {d.panel}
              </span>
              <span className="lh-inline">
                <span className="lh-live" aria-hidden />
                {d.live}
              </span>
            </div>
            <div className="lh-dev-grid">
              <div className="lh-pane">
                <span className="lb-eyebrow">{d.sales}</span>
                <span className="lh-pane-big">{d.total}</span>
                <span className="lh-up">{d.delta}</span>
                <div className="lh-bars">
                  {BARS.map((bar, i) => (
                    <span key={i} className={i === BARS.length - 1 ? "is-hot" : undefined} style={{ height: `${bar}%` }} />
                  ))}
                </div>
              </div>
              <div className="lh-pane">
                <span className="lb-eyebrow">{d.room}</span>
                <div className="lh-tables">
                  {TABLES.map((state, i) => (
                    <span key={i} className={`lh-tb is-${state}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="lh-pane">
                <span className="lb-eyebrow">{d.kitchen}</span>
                {d.tickets.map((ticket) => (
                  <div key={ticket.label} className="lh-tk">
                    <span>{ticket.label}</span>
                    <span className={`lh-st is-${ticket.tone}`}>{ticket.state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lh-phone" aria-hidden>
            <div className="lh-phone-in">
              <div className="lh-notch" />
              <span className="lb-eyebrow">{phone.table}</span>
              <span className="lh-phone-title">{phone.title}</span>
              {phone.items.map((item) => (
                <div key={item.name} className="lh-line">
                  <span>{item.name}</span>
                  <span>{item.price}</span>
                </div>
              ))}
              <div className="lh-send">
                {phone.send} · {phone.total}
              </div>
            </div>
          </div>
        </div>
        <p className="lh-note lh-demo-note">{d.note}</p>
      </div>
      {demoOpen && <DemoVideoModal onClose={() => setDemoOpen(false)} />}
    </section>
  );
}
