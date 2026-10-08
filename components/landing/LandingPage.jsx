"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The rest of the home page, design B: the 48 h / 0 % cards, the plans and
 * the closing call. (The hero, marquee, "Tres pantallas" and "Todo el turno"
 * live in components/sections/Hero, Marquee, Showcase and Features.)
 *
 * Flows kept:
 *   - "Reserva tu piloto" opens the shared lead form;
 *   - the anchors other pages link to still resolve: /#cta and /#contacto →
 *     the closing call, and arriving on /#contacto also opens the form,
 *     because that is what the other pages' "Reservar mi plaza" promises.
 */
export default function LandingPage() {
  const { t } = useLanguage();
  const l = t.landing;
  const { openLeadForm } = useLeadCapture();
  const reserve = () => openLeadForm({ source: "web_form" });

  useEffect(() => {
    const check = () => {
      if (window.location.hash !== "#contacto") return;
      openLeadForm({ source: "web_form" });
      // Drop the hash so the same link works again after the form closes
      // (an unchanged hash fires no hashchange).
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [openLeadForm]);

  return (
    <>
      <Pilot p={l.pilot} />
      <Plans p={l.plans} prices={t.chat.plans.items.map((plan) => plan.price)} />
      <Reserve r={l.reserve} onReserve={reserve} />
    </>
  );
}

function Check({ color = "#d4401d", size = 14, width = 2.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/* --------------------------------------------------------- 48 h / 0 % */

function Pilot({ p }) {
  const nodes = ["n48a", "n48b", "n48c"];
  const ledger = p.ledger;
  return (
    <section id="piloto" className="lb-section">
      <div className="lb-wrap lb-row">
        <div className="lb-pilot-card is-light lb-reveal">
          <span className="lb-eyebrow" style={{ color: "#5f5a54" }}>
            {p.eyebrow}
          </span>
          <span className="lb-big-num" aria-label="48 h">
            48<span style={{ color: "#d4401d" }}>h</span>
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "8px 0" }}>
            <div style={{ position: "relative", height: 26, margin: "0 13px" }} aria-hidden>
              <div style={{ position: "absolute", left: 0, right: 0, top: 12, height: 2, borderRadius: 2, background: "#e1dbd4", overflow: "hidden" }}>
                <div className="pv f48" style={{ position: "absolute", inset: 0, background: "#1c1a18" }} />
              </div>
              {["0", "24", "48"].map((n, i) => (
                <span key={n} className={`lb-node pv ${nodes[i]}`} style={{ left: `${i * 50}%` }}>
                  {n}
                </span>
              ))}
            </div>
            <div className="lb-steps3">
              {p.steps.map((step, i) => (
                <div key={i}>
                  <span style={{ fontWeight: 600 }}>{step.title}</span>
                  <span style={{ color: "#5f5a54" }}>{step.copy}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.chips.map((chip, i) => (
                <span key={i} className="lb-chip pv chip48" style={{ animationDelay: `${i * 0.35}s` }}>
                  <Check width={3} size={12} />
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <span style={{ fontSize: 18, lineHeight: 1.5, color: "#4a4540", maxWidth: 460 }}>{p.copy}</span>
        </div>

        <div className="lb-pilot-card is-dark lb-reveal">
          <span className="lb-eyebrow">{ledger.eyebrow}</span>
          <span className="lb-big-num" aria-label="0 %">
            0<span style={{ color: "#ff5a33" }}>%</span>
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, padding: "8px 0" }}>
            <div className="lb-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.06em", color: "#8a8278", paddingBottom: 6, borderBottom: "1px solid rgba(243,239,230,0.08)", textTransform: "uppercase" }}>
              {ledger.head.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {ledger.rows.map((row, i) => (
              <div key={i} className={`lb-ledger-row lg lr${i + 1}`}>
                <span>{row.label}</span>
                <span className="lb-mono" style={{ color: "#8a8278" }}>
                  {ledger.fee}
                </span>
                <span style={{ textAlign: "right", fontWeight: 600 }}>{row.amount}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10 }}>
              <span style={{ fontSize: 14, color: "#a39b90" }}>{ledger.totalLabel}</span>
              <span className="lb-stack lb-display" style={{ justifyItems: "end", fontSize: 30, letterSpacing: "-0.04em" }}>
                {ledger.totals.map((total, i) => (
                  <span key={i} className={`lg lt${i + 1}`}>
                    {total}
                  </span>
                ))}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 8, background: "rgba(243,239,230,0.08)", overflow: "hidden", marginTop: 6 }}>
              <div className="lg lbar" style={{ height: "100%", borderRadius: 8, background: "#ff5a33" }} />
            </div>
            <span style={{ fontSize: 12, color: "#8a8278" }}>{ledger.note}</span>
          </div>
          <span style={{ fontSize: 18, lineHeight: 1.5, color: "#b9b1a5", maxWidth: 460 }}>{ledger.copy}</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- plans */

function Plans({ p, prices }) {
  return (
    <section id="planes" className="lb-section" style={{ paddingBottom: 0 }}>
      <div className="lb-wrap">
        <div className="lb-head-row">
          <h2 className="lb-h2 lb-reveal">
            {p.title}
            <br />
            <span>{p.titleMuted}</span>
          </h2>
          <Link href="/precios" className="lb-reveal lb-link-accent" style={{ fontSize: 17, marginBottom: 10 }}>
            {p.compare}
          </Link>
        </div>
        <div className="lb-row" style={{ marginTop: 48 }}>
          {p.items.map((plan, i) => {
            const featured = i === 1;
            return (
              <div key={plan.name} className={`lb-plan lb-reveal ${featured ? "is-featured" : "lb-card"}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{plan.name}</span>
                  {featured && (
                    <span style={{ fontSize: 12, fontWeight: 600, background: "#d4401d", color: "#fff", padding: "4px 10px", borderRadius: 999 }}>
                      {p.popular}
                    </span>
                  )}
                </div>
                <span className="lb-plan-price">{prices[i]}</span>
                <span style={{ fontSize: 13, color: featured ? "#5f5a54" : "#a39b90" }}>{p.period}</span>
                <span style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5, color: featured ? "#4a4540" : "#b9b1a5" }}>{plan.copy}</span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "22px 0 0", fontSize: 14, color: "#a39b90" }}>{p.note}</p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- reserve */

function Reserve({ r, onReserve }) {
  return (
    <section id="reserva" className="lb-reserve">
      <span id="cta" className="lb-anchor" aria-hidden />
      <span id="contacto" className="lb-anchor" aria-hidden />
      <div className="lb-reserve-glow" aria-hidden />
      <h2 className="lb-h2-xl lb-reveal">
        {r.title}
        <br />
        <span>{r.titleMuted}</span>
      </h2>
      <p className="lb-reveal" style={{ margin: "28px auto 0", maxWidth: 500, fontSize: 19, lineHeight: 1.5, color: "#b9b1a5" }}>
        {r.copy}
      </p>
      <div className="lb-hero-ctas lb-reveal">
        <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={onReserve}>
          {r.cta}
        </button>
        <Link href="/precios" className="lb-text-link">
          {r.plans}
        </Link>
      </div>
    </section>
  );
}
