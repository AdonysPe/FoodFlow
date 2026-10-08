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

/**
 * Home hero, design B ("Noche"): the headline that resolves word by word,
 * the two actions, and below them the kitchen pass — tickets crossing
 * Mesa → Cocina → Listo — over a slow perspective floor.
 *
 * "Reserva tu piloto" opens the shared lead form. "Ver el producto" opens
 * the demo video (the dialog the old "Ver demo" button opened).
 */
// Trails ride grid lines: each sits `n` lines from the centre (see .lb-trail),
// so they stay on a line at any width. The two outermost drop out on narrow
// screens.
const TRAILS = [
  { n: -5, delay: "0s", far: true },
  { n: -3, delay: "-1.7s" },
  { n: 0, delay: "-3.4s" },
  { n: 1, delay: "-5.1s" },
  { n: 4, delay: "-2.6s", duration: "8.5s" },
  { n: 6, delay: "-6.2s", duration: "8.5s", far: true },
];
const TICKET_DELAYS = ["-0.8s", "-3.6s", "-6.4s", "-9.2s"];

export default function Hero() {
  const { t } = useLanguage();
  const { openLeadForm } = useLeadCapture();
  const [demoOpen, setDemoOpen] = useState(false);
  const l = t.landing;
  const h = l.hero;
  const pass = l.pass;
  const onReserve = () => openLeadForm({ source: "web_form" });
  // Word delays continue across both lines, as in the prototype.
  const first = h.line1.map((w, i) => ({ w, d: 0.1 + i * 0.12 }));
  const second = h.line2.map((w, i) => ({ w, d: 0.38 + i * 0.14 }));

  return (
    <section id="inicio" className="lb-hero">
      <div className="lb-hero-bg" aria-hidden>
        <div className="lb-orb1" />
        <div className="lb-orb2" />
        <div className="lb-floor">
          <div className="lb-floor-plane">
            <div className="lb-gridflow" />
            {TRAILS.map((trail, i) => (
              <span
                key={i}
                className={`lb-trail${trail.far ? " lb-trail--far" : ""}`}
                style={{ "--n": trail.n, animationDelay: trail.delay, animationDuration: trail.duration }}
              />
            ))}
          </div>
        </div>
        <div className="lb-horizon" />
      </div>
      <div className="lb-glow" aria-hidden />

      <div className="lb-hero-copy">
        <p className="lb-badge lb-rise">
          <span className="lb-dot lb-pulse" aria-hidden />
          {h.badge}
        </p>

        <h1 className="lb-h1">
          {first.map(({ w, d }, i) => (
            <span key={`a${i}`}>
              <span className="lb-word" style={{ animationDelay: `${d}s` }}>
                {w}
              </span>{" "}
            </span>
          ))}
          <br />
          {second.map(({ w, d }, i) => (
            <span key={`b${i}`}>
              <span className="lb-word" style={{ animationDelay: `${d}s`, color: "#8a8278" }}>
                {w}
                {i === second.length - 1 && <span style={{ color: "#ff5a33" }}>.</span>}
              </span>
              {i < second.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        <p className="lb-hero-sub lb-rise" style={{ animationDelay: ".75s" }}>
          {h.sub}
        </p>

        <div className="lb-hero-ctas lb-rise" style={{ animationDelay: ".9s" }}>
          <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={onReserve}>
            {h.cta}
          </button>
          {/* The demo video opens from here: same dialog as before the redesign. */}
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
      <div className="lb-pass lb-rise" style={{ animationDelay: "1s" }} role="img" aria-label={pass.aria}>
        <div className="lb-pass-stages">
          {pass.stages.map((stage, i) => (
            <span key={i} className="lb-rise" style={{ animationDelay: `${1.3 + i * 0.15}s` }}>
              {stage}
            </span>
          ))}
        </div>
        <div className="lb-pass-divider" style={{ left: "33.33%" }} />
        <div className="lb-pass-divider" style={{ left: "66.66%" }} />
        <div className="lb-draw">
          <svg width="100%" height="2" preserveAspectRatio="none" aria-hidden style={{ display: "block" }}>
            <line className="lb-dash" x1="0" y1="1" x2="100%" y2="1" stroke="rgba(243,239,230,0.28)" strokeWidth="2" strokeDasharray="12 12" />
          </svg>
        </div>

        {pass.tickets.map((ticket, i) => (
          <div key={i} className={`lb-ticket${i % 2 ? " lb-ticket--extra" : ""}`} style={{ animationDelay: TICKET_DELAYS[i] }}>
            <div className="lb-ticket-card">
              <div className="lb-ticket-head">
                <span>{ticket.label}</span>
                <span className="lb-state" style={{ animationDelay: TICKET_DELAYS[i] }} />
              </div>
              {ticket.lines.map((line, j) => (
                <span key={j} className={`lb-ticket-line${line.startsWith("—") ? " is-note" : ""}`}>
                  {line}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div className="lb-pass-legend">
          {pass.legend.map((label, i) => (
            <span key={i}>
              <i style={{ background: ["#6f675e", "#f3efe6", "#ff5a33"][i] }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      {demoOpen && <DemoVideoModal onClose={() => setDemoOpen(false)} />}
    </section>
  );
}
