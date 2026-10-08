"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import Image from "next/image";

const PHOTO = {
  ceviche: "/demo/carta/ceviche.webp",
  pisco: "/demo/carta/pisco-sour.webp",
};

/**
 * "Tres pantallas. Un solo pedido." — one order (Mesa 07) followed across the
 * guest's phone, the kitchen screen and the owner's dashboard. One 12-second
 * CSS clock drives all three. Every figure is demo data and says so.
 *
 * Keeps the #product anchor the demo video's footer link and the shared
 * navbar point at.
 */
export default function Showcase() {
  const { t } = useLanguage();
  const s = t.landing.story;
  return (
    <section id="pantallas" className="lb-section">
      <span id="product" className="lb-anchor" aria-hidden />
      <div className="lb-wrap">
        <div className="lb-head-row">
          <h2 className="lb-h2 lb-reveal" style={{ maxWidth: 700 }}>
            {s.title}
            <br />
            <span>{s.titleMuted}</span>
          </h2>
          <p className="lb-lede lb-reveal">{s.lede}</p>
        </div>

        <div className="lb-stepper" aria-hidden>
          <div className="lb-stepper-track">
            <div className="sb sbfill" style={{ position: "absolute", inset: 0, background: "#ff5a33" }} />
          </div>
          {s.steps.map((label, i) => (
            <div key={i} className="lb-step" style={{ left: `${16.66 + i * 33.335}%` }}>
              <span className="lb-step-num">
                <i className={`sb hl${i + 1}`} />
                <b>{i + 1}</b>
              </span>
              <span className="lb-step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="lb-row lb-story-cards">
          <StoryCard card={s.cards[0]} index={1}>
            <Phone phone={s.phone} />
          </StoryCard>
          <StoryCard card={s.cards[1]} index={2}>
            <Kitchen kitchen={s.kitchen} />
          </StoryCard>
          <StoryCard card={s.cards[2]} index={3}>
            <OwnerPanel panel={s.panel} />
          </StoryCard>
        </div>
        <p className="lb-note">{s.note}</p>
      </div>
    </section>
  );
}

function StoryCard({ card, index, children }) {
  return (
    <article className="lb-card lb-story-card">
      <span className={`lb-story-ring sb hl${index}`} aria-hidden />
      {children}
      <div className="lb-story-copy">
        <span className="lb-eyebrow">{card.eyebrow}</span>
        <h3 className="lb-story-title" style={{ margin: 0 }}>
          {card.title}
        </h3>
        <span className="lb-story-text">{card.copy}</span>
      </div>
    </article>
  );
}

function Check({ color = "#d4401d", size = 14, width = 2.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Phone({ phone }) {
  const photos = [PHOTO.ceviche, PHOTO.pisco];
  return (
    <div className="lb-phone-slot">
      <div className="lb-phone">
        <div className="lb-phone-screen">
          <span style={{ fontSize: 11, color: "#a39b90" }}>{phone.table}</span>
          <span className="lb-display" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>
            {phone.title}
          </span>
          {phone.items.map((item, i) => (
            <div key={i} className="lb-phone-item">
              <Image src={photos[i]} alt={item.name} width={40} height={40} sizes="40px" loading="lazy" decoding="async" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 550 }}>{item.name}</span>
              <span style={{ fontSize: 12, color: "#a39b90" }}>{item.price}</span>
            </div>
          ))}
          <div className="lb-phone-send sb press">
            <span>{phone.send}</span>
            <span>{phone.total}</span>
          </div>
        </div>
        <div className="lb-phone-toast sb toast2">
          <Check />
          {phone.sent}
        </div>
      </div>
    </div>
  );
}

function Kitchen({ kitchen }) {
  return (
    <div className="lb-screen lb-kds">
      <div className="lb-screen-head">
        <span>{kitchen.label}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="lb-dot lb-pulse" />
          {kitchen.live}
        </span>
      </div>
      <div className="lb-kds-ticket sb tk">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="lb-mono" style={{ fontSize: 16, fontWeight: 600, textTransform: "uppercase" }}>
            {kitchen.ticket}
          </span>
          <span className="lb-stack" style={{ justifyItems: "end", fontSize: 12, fontWeight: 600 }}>
            <span className="sb s1" style={{ color: "#ff7a57", padding: "4px 9px" }}>
              {kitchen.states[0]}
            </span>
            <span className="sb s2" style={{ color: "#f3efe6", padding: "4px 9px", border: "1px solid rgba(243,239,230,0.25)", borderRadius: 999 }}>
              {kitchen.states[1]}
            </span>
            <span className="sb s3" style={{ background: "#ff5a33", color: "#0c0908", padding: "4px 9px", borderRadius: 999 }}>
              {kitchen.states[2]}
            </span>
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#a39b90" }}>{kitchen.source}</span>
        {kitchen.lines.map((line, i) => (
          <span key={i} style={{ fontSize: 15 }}>
            {line}
          </span>
        ))}
      </div>
      <div className="lb-kds-old">
        <div className="lb-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, textTransform: "uppercase" }}>
          <span>{kitchen.other}</span>
          <span style={{ color: "#a39b90", fontWeight: 500 }}>06:12</span>
        </div>
        <span style={{ fontSize: 14 }}>{kitchen.otherLine}</span>
      </div>
    </div>
  );
}

function OwnerPanel({ panel }) {
  return (
    <div className="lb-screen lb-owner">
      <div className="lb-screen-head">
        <span>{panel.label}</span>
        <span>{panel.demo}</span>
      </div>
      <div className="lb-owner-body">
        <div className="lb-owner-left">
          <span style={{ fontSize: 13, color: "#a39b90" }}>{panel.sales}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="lb-stack lb-display" style={{ fontSize: 46, letterSpacing: "-0.05em", lineHeight: 1 }}>
              <span className="sb n1">{panel.before}</span>
              <span className="sb n2">{panel.after}</span>
            </span>
            <span className="sb plus" style={{ fontSize: 13, fontWeight: 600, color: "#3ddc97", background: "rgba(61,220,151,0.12)", padding: "4px 9px", borderRadius: 999 }}>
              {panel.plus}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span className="lb-mini-table is-busy">02</span>
            <span className="lb-mini-table is-free">05</span>
            <span className="lb-mini-table sb t7">07</span>
            <span className="lb-mini-table is-busy">09</span>
            <span className="lb-mini-table is-busy">11</span>
          </div>
        </div>
        <div className="lb-owner-right">
          <div className="lb-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.08em", color: "#8a8278", textTransform: "uppercase" }}>
            <span>{panel.byHour}</span>
            <span>{panel.today}</span>
          </div>
          <div style={{ position: "relative", height: 64 }}>
            <svg viewBox="0 0 200 64" preserveAspectRatio="none" width="100%" height="64" aria-hidden style={{ display: "block", overflow: "visible" }}>
              <path d="M0,58 L20,54 L40,46 L60,50 L80,38 L100,42 L120,28 L140,32 L160,22 L180,26 L180,64 L0,64 Z" fill="rgba(243,239,230,0.05)" />
              <path d="M0,58 L20,54 L40,46 L60,50 L80,38 L100,42 L120,28 L140,32 L160,22 L180,26" fill="none" stroke="rgba(243,239,230,0.45)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path className="sb sseg" d="M180,26 L200,10" fill="none" stroke="#ff5a33" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="sb sdot" style={{ position: "absolute", right: -4, top: 6, width: 9, height: 9, borderRadius: "50%", background: "#ff5a33", boxShadow: "0 0 0 4px rgba(255,90,51,0.25)" }} />
          </div>
          <span style={{ fontSize: 11, color: "#8a8278", marginTop: 2 }}>{panel.recent}</span>
          <div className="lb-pay-row sb paid" style={{ borderRadius: 8, background: "rgba(61,220,151,0.1)" }}>
            <span>{panel.newest.label}</span>
            <span style={{ fontWeight: 600, color: "#3ddc97" }}>{panel.newest.amount}</span>
          </div>
          {panel.others.map((row, i) => (
            <div key={i} className="lb-pay-row">
              <span style={{ color: "#cfc7bb" }}>{row.label}</span>
              <span>{row.amount}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sb paid" style={{ marginTop: "auto", background: "#1d1714", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
        <Check color="#3ddc97" size={16} />
        <span style={{ flex: 1 }}>{panel.paid}</span>
        <span style={{ color: "#a39b90" }}>{panel.paidAmount}</span>
      </div>
    </div>
  );
}
