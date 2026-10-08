"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCurrency } from "@/lib/format";

const COMMISSION_MIN = 20;
const COMMISSION_MAX = 35;
const COMMISSION_DEFAULT = 30;

/** Digits only, capped so a stray keypress cannot produce a silly number. */
function toAmount(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  return digits ? Number(digits) : 0;
}

function groupDigits(value) {
  return value > 0 ? value.toLocaleString("es-PE") : "";
}

/** "Tu propia web de pedidos, con tu nombre" → two lines, the second muted. */
function splitTitle(title) {
  const at = title.indexOf(", ");
  return at === -1 ? [title, ""] : [`${title.slice(0, at)},`, `${title.slice(at + 2)}.`];
}

/**
 * /calculadora, design B ("Noche"), as approved in the prototype: the
 * headline, the two cards (your numbers / what you lose), the note and its two
 * guide links, the "your own ordering site" demo, and the closing call.
 *
 * The lead magnet works as before. The result is live and free — no name, no
 * email — and starts empty on purpose: the figure travels to the lead form
 * (`source: "calculadora"`, `loss`) and scores the lead, so it must be one
 * the visitor typed, never an example. "Quiero recuperarlo" only exists once
 * there is a result.
 *
 * `as` is forwarded so /calculadora keeps the h1.
 */
export default function Calculator({ as: Heading = "h1" }) {
  const { t } = useLanguage();
  const c = t.calculator;
  const web = t.customSite;
  const { openLeadForm } = useLeadCapture();

  const [sales, setSales] = useState(0);
  const [commission, setCommission] = useState(COMMISSION_DEFAULT);
  const [orders, setOrders] = useState(0);

  const uid = useId();
  const salesId = `${uid}-sales`;
  const commissionId = `${uid}-commission`;
  const ordersId = `${uid}-orders`;

  const { monthly, yearly, perOrder } = useMemo(() => {
    const month = sales * (commission / 100);
    return { monthly: month, yearly: month * 12, perOrder: orders > 0 ? month / orders : null };
  }, [sales, commission, orders]);
  const hasResult = sales > 0;
  const [webTitle, webTitleMuted] = splitTitle(web.title);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="lb-pr-hero" style={{ paddingTop: 96 }}>
        <div className="lb-glow" aria-hidden style={{ top: 20, height: 520 }} />
        <p className="lb-eyebrow-accent lb-rise">{c.eyebrow}</p>
        <Heading className="lb-pr-h1" style={{ fontSize: "clamp(44px, 6.6vw, 96px)", lineHeight: 0.95, maxWidth: 980 }}>
          {c.line1.map((w, i) => (
            <span key={`a${i}`}>
              <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.1}s` }}>
                {w}
              </span>{" "}
            </span>
          ))}
          <br />
          {c.line2.map((w, i) => (
            <span key={`b${i}`}>
              <span className="lb-word" style={{ animationDelay: `${0.4 + i * 0.1}s`, color: "#8a8278" }}>
                {w}
              </span>{" "}
            </span>
          ))}
          {c.line3.map((w, i) => (
            <span key={`c${i}`}>
              <span className="lb-word" style={{ animationDelay: `${0.7 + i * 0.1}s` }}>
                {w}
                {i === c.line3.length - 1 && <span style={{ color: "#ff5a33" }}>?</span>}
              </span>
              {i < c.line3.length - 1 ? " " : ""}
            </span>
          ))}
        </Heading>
        <p className="lb-pr-sub lb-rise" style={{ animationDelay: ".9s", maxWidth: 600, fontSize: 19 }}>
          {c.description}
        </p>
      </section>

      {/* ----------------------------------------------------------- cards */}
      <section className="lb-pr-block" style={{ paddingTop: 64 }}>
        <div className="lb-row lb-rise" style={{ alignItems: "stretch", animationDelay: "1s" }}>
          <div className="lb-calc-card">
            <span className="lb-eyebrow">{c.yourNumbers}</span>

            <div className="lb-calc-field">
              <label htmlFor={salesId} style={{ fontSize: 15, fontWeight: 600 }}>
                {c.salesLabel}
              </label>
              <div className="lb-calc-input lb-calc-input--lg">
                <span style={{ fontSize: 18, color: "#a39b90", fontWeight: 600 }}>S/</span>
                <input
                  id={salesId}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="12,000"
                  value={groupDigits(sales)}
                  onChange={(e) => setSales(toAmount(e.target.value))}
                />
              </div>
              <span className="lb-calc-hint">{c.salesHint}</span>
            </div>

            <div className="lb-calc-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <label htmlFor={commissionId} style={{ fontSize: 15, fontWeight: 600 }}>
                  {c.commissionLabel}
                </label>
                <output htmlFor={commissionId} className="lb-display" style={{ fontSize: 30, letterSpacing: "-0.04em", color: "#ff5a33" }}>
                  {commission}%
                </output>
              </div>
              <input
                id={commissionId}
                type="range"
                min={COMMISSION_MIN}
                max={COMMISSION_MAX}
                step={1}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="lb-range"
              />
              <div className="lb-calc-hint" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{COMMISSION_MIN}%</span>
                <span style={{ textAlign: "center" }}>{c.commissionHint}</span>
                <span>{COMMISSION_MAX}%</span>
              </div>
            </div>

            <div className="lb-calc-field">
              <label htmlFor={ordersId} style={{ fontSize: 15, fontWeight: 600 }}>
                {c.ordersLabel} <span style={{ fontWeight: 400, color: "#8a8278" }}>· {c.ordersOptional}</span>
              </label>
              <div className="lb-calc-input">
                <input
                  id={ordersId}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="320"
                  value={groupDigits(orders)}
                  onChange={(e) => setOrders(toAmount(e.target.value))}
                />
              </div>
              <span className="lb-calc-hint">{c.ordersHint}</span>
            </div>
          </div>

          <div className="lb-calc-result" aria-live="polite">
            <span className="lb-mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "#5f5a54", textTransform: "uppercase" }}>
              {c.resultLabel}
            </span>
            {!hasResult ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 18, color: "#5f5a54", minHeight: 220 }}>
                {c.empty}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="lb-display lb-swap" key={Math.round(monthly)} style={{ fontSize: "clamp(44px, 5vw, 78px)", letterSpacing: "-0.06em", lineHeight: 0.95, color: "#c9391a" }}>
                    {formatCurrency(monthly)}
                  </span>
                  <span style={{ fontSize: 15, color: "#5f5a54" }}>{c.perMonth}</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div className="lb-calc-stat">
                    <span style={{ fontSize: 13, color: "#5f5a54" }}>{c.perYear}</span>
                    <span className="lb-display lb-swap" key={Math.round(yearly)} style={{ fontSize: 28, letterSpacing: "-0.04em" }}>
                      {formatCurrency(yearly)}
                    </span>
                  </div>
                  <div className="lb-calc-stat">
                    <span style={{ fontSize: 13, color: "#5f5a54" }}>{c.perOrder}</span>
                    <span className="lb-display lb-swap" key={perOrder === null ? "-" : Math.round(perOrder * 100)} style={{ fontSize: 28, letterSpacing: "-0.04em" }}>
                      {perOrder === null ? "—" : formatCurrency(perOrder)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: "#5f5a54" }}>{c.split.label}</span>
                  <div className="lb-split" style={{ background: "#e1dbd4" }}>
                    <div style={{ display: "flex", alignItems: "center", paddingLeft: 12, background: "#d4401d", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", transition: "width .5s cubic-bezier(.2,.8,.2,1)", width: `${commission}%` }}>
                      {c.split.app.replace("{n}", String(commission))}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, color: "#1c1a18", whiteSpace: "nowrap" }}>
                      {c.split.keep.replace("{n}", String(100 - commission))}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: "#5f5a54" }}>{c.split.withFoodflow}</span>
                  <div className="lb-split" style={{ background: "#1c1a18", color: "#f3efe6", justifyContent: "space-between", alignItems: "center", padding: "0 12px" }}>
                    <span>{c.split.zero}</span>
                    <span>{c.split.all}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="lb-calc-cta"
                  onClick={() =>
                    openLeadForm({
                      source: "calculadora",
                      loss: { mensual: Math.round(monthly), anual: Math.round(yearly) },
                    })
                  }
                >
                  {c.cta}
                </button>
                <span style={{ textAlign: "center", fontSize: 12, color: "#5f5a54" }}>{c.ctaNote}</span>
              </>
            )}
          </div>
        </div>

        <p style={{ maxWidth: 760, margin: "24px auto 0", textAlign: "center", fontSize: 13, lineHeight: 1.55, color: "#8a8278" }}>{c.disclaimer}</p>
        <div className="lb-calc-links">
          <Link href="/comisiones-rappi-pedidosya">{c.guideLink} ›</Link>
          <Link href="/alternativa-a-rappi">{t.rappiAlternative.eyebrow} ›</Link>
        </div>
      </section>

      {/* ------------------------------------------------- your own site */}
      <section className="lb-pr-block" style={{ paddingTop: 150 }}>
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="lb-eyebrow-accent lb-reveal" style={{ margin: 0 }}>
              {web.eyebrow} · {web.productName}
            </span>
            <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(40px, 5vw, 68px)" }}>
              {webTitle}
              <br />
              <span>{webTitleMuted}</span>
            </h2>
            <p className="lb-reveal" style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: "#b9b1a5", maxWidth: 480 }}>
              {web.description}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {web.items.map((item, i) => (
                <div key={i} className="lb-reveal lb-calc-item" style={{ borderBottom: i === web.items.length - 1 ? "1px solid rgba(243,239,230,0.08)" : undefined }}>
                  <span className="lb-mono" style={{ fontSize: 13, color: "#ff7a57" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: 15, lineHeight: 1.5, color: "#b9b1a5" }}>{item.copy}</span>
                  </span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "#8a8278" }}>{web.footnote}</span>
          </div>

          <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", justifyContent: "center" }}>
            <div className="lb-float lb-site">
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 14px", borderBottom: "1px solid rgba(243,239,230,0.07)" }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 9, height: 9, borderRadius: "50%", background: "#3a302b" }} />
                ))}
                <span className="lb-mono" style={{ marginLeft: 10, flex: 1, minWidth: 0, textAlign: "center", fontSize: 11, color: "#a39b90", background: "#0c0908", borderRadius: 8, padding: "5px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {web.demo.browserUrl}
                </span>
              </div>
              <div style={{ position: "relative", height: 150 }}>
                <Image src="/demo/carta/lomo-saltado.webp" alt="" fill sizes="(max-width: 640px) calc(100vw - 32px), 440px" loading="lazy" decoding="async" style={{ objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(22,17,15,0) 30%, #16110f 100%)" }} />
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 12, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="lb-display" style={{ fontSize: 26, letterSpacing: "-0.04em" }}>
                    {web.demo.brand}
                  </span>
                  <span style={{ fontSize: 12, color: "#cfc7bb" }}>
                    {web.demo.tagline} · {web.demo.rating}
                  </span>
                </div>
              </div>
              <div style={{ padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, background: "#f3efe6", color: "#0c0908", padding: "6px 12px", borderRadius: 999 }}>{web.demo.ctaMenu}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, border: "1px solid rgba(243,239,230,0.2)", padding: "6px 12px", borderRadius: 999 }}>{web.demo.ctaReserve}</span>
                </div>
                {web.demo.items.map((item, i) => (
                  <div key={i} className={`wi wi${i + 1}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: 10, borderRadius: 12 }}>
                    <span>{item.name}</span>
                    <span style={{ color: "#cfc7bb" }}>{item.price}</span>
                  </div>
                ))}
                <div className="wi wbar" style={{ marginTop: 6, background: "#ff5a33", color: "#0c0908", borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                  <span>{web.demo.orderBar}</span>
                  <span>{web.demo.orderButton}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- close */}
      <section className="lb-reserve">
        <div className="lb-reserve-glow" aria-hidden />
        <h2 className="lb-h2-xl lb-reveal" style={{ fontSize: "clamp(44px, 7vw, 100px)", lineHeight: 0.95 }}>
          {c.closing.line1}
          <br />
          <span>{c.closing.line2}</span>
        </h2>
        <div className="lb-hero-ctas lb-reveal">
          <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={() => openLeadForm({ source: "web_form" })}>
            {c.closing.cta}
          </button>
          <Link href="/precios" className="lb-text-link">
            {c.closing.plans}
          </Link>
        </div>
        <p style={{ margin: "56px 0 0", fontSize: 12, color: "#8a8278" }}>{c.trademarks}</p>
      </section>
    </>
  );
}
