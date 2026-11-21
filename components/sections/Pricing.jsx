"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { PLANS, PLAN_MONTHLY_CENTS } from "@/lib/plans";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Checks, DataTable, fill, planPrices } from "@/components/seo/Article";


/**
 * /precios, design B ("Noche"), as approved in the prototype: the headline,
 * a "find your plan" panel (team size, analytics), the
 * three plan cards, the four promises, the comparison table, the add-ons,
 * what it doesn't include, a comparison against the alternatives by type
 * (no competitor names or prices, which nobody can keep current), the
 * questions and the closing call.
 *
 * Flows kept:
 *   - prices come from lib/plans.ts, IGV included — the figure checkout
 *     charges — so the page cannot drift from what is billed
 *     (lib/plans.test.ts guards the copy);
 *   - each plan button still goes to /register?plan=<carta|servicio|negocio>;
 *   - "Reserva tu piloto" opens the shared lead form.
 *
 * `as` is forwarded so /precios keeps the h1.
 */
export default function Pricing({ as: Heading = "h1" }) {
  const { t } = useLanguage();
  const p = t.pricing.page;
  const { openLeadForm } = useLeadCapture();

  const [team, setTeam] = useState(1); // 0 = just me, 1 = 2 to 10, 2 = over 10
  const [stats, setStats] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  // The plan that fits the answers: analytics or a big team needs Negocio,
  // a team needs Servicio, a one-person shop needs Carta.
  const rec = stats || team === 2 ? 2 : team === 1 ? 1 : 0;
  const price = PLANS.map((key) => PLAN_MONTHLY_CENTS[key] / 100);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="lb-pr-hero">
        <div className="lb-glow" aria-hidden style={{ top: 40, height: 460 }} />
        <p className="lb-eyebrow-accent lb-rise">{p.eyebrow}</p>
        <Heading className="lb-pr-h1">
          {p.line1.map((w, i) => (
            <span key={`a${i}`}>
              <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.1}s` }}>
                {w}
              </span>{" "}
            </span>
          ))}
          <br />
          {p.line2.map((w, i) => (
            <span key={`b${i}`}>
              <span className="lb-word" style={{ animationDelay: `${0.5 + i * 0.1}s`, color: "var(--c-ada599, #ada599)" }}>
                {w}
                {i === p.line2.length - 1 && <span style={{ color: "var(--ct-ff5a33, #ff5a33)" }}>.</span>}
              </span>
              {i < p.line2.length - 1 ? " " : ""}
            </span>
          ))}
        </Heading>
        <p className="lb-pr-sub lb-rise" style={{ animationDelay: ".85s" }}>
          {p.sub}
        </p>
      </section>

      {/* ---------------------------------------------------------- finder */}
      <section className="lb-pr-block" style={{ paddingTop: 64 }}>
        <div className="lb-finder lb-rise" style={{ animationDelay: "1s" }}>
          <span className="lb-display lb-finder-title">{p.finder.title}</span>
          <div className="lb-finder-group">
            <span id="lb-team-label" style={{ fontSize: 14, color: "var(--c-d6cfc3, #d6cfc3)" }}>
              {p.finder.teamLabel}
            </span>
            <div className="lb-seg" role="group" aria-labelledby="lb-team-label">
              {p.finder.team.map((label, i) => (
                <button key={i} type="button" aria-pressed={team === i} className={team === i ? "is-on" : ""} onClick={() => setTeam(i)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" role="switch" aria-checked={stats} className="lb-switch-row" onClick={() => setStats((v) => !v)}>
            <span className={`lb-toggle${stats ? " is-on" : ""}`}>
              <i />
            </span>
            {p.finder.stats}
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------------- plans */}
      <section className="lb-pr-block" style={{ paddingTop: 28 }}>
        <div className="lb-row" style={{ alignItems: "stretch" }}>
          {p.plans.map((plan, i) => {
            const on = rec === i;
            const popular = i === 1 && !on;
            return (
              <article key={plan.name} className={`lb-pr-card${on ? " is-rec" : ""}`}>
                <div className="lb-pr-card-head">
                  <span className="lb-display" style={{ fontSize: 24, letterSpacing: "-0.03em" }}>
                    {plan.name}
                  </span>
                  {on && (
                    <span className="lb-pr-tag is-solid lb-pop">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                      {p.recommended}
                    </span>
                  )}
                  {popular && <span className="lb-pr-tag">{p.popular}</span>}
                </div>
                <span className="lb-pr-pitch">{plan.pitch}</span>
                <div className="lb-pr-price">
                  <span style={{ fontSize: 22, fontWeight: 600 }}>S/</span>
                  <span className="lb-display lb-pr-num">{price[i]}</span>
                  <span className="lb-pr-muted">{p.perMonth}</span>
                </div>
                <span className="lb-pr-muted" style={{ fontSize: 13 }}>
                  {p.taxIncluded}
                </span>
                <Link href={`/register?plan=${encodeURIComponent(PLANS[i])}`} className="lb-pr-cta">
                  {p.cta.replace("{plan}", plan.name)}
                </Link>
                <hr className="lb-pr-rule" />
                <span className="lb-mono lb-pr-muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {plan.users}
                </span>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.4 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={on ? "#d4401d" : "#ff5a33"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 13, lineHeight: 1.5, color: "var(--c-ada599, #ada599)" }}>{p.taxNote}</p>
      </section>

      {/* ----------------------------------------------------------- strip */}
      <section className="lb-pr-block" style={{ paddingTop: 72 }}>
        <div className="lb-pr-strip lb-reveal">
          {p.strip.map((item, i) => (
            <div key={i}>
              <span className="lb-display" style={{ fontSize: 40, letterSpacing: "-0.05em", lineHeight: 1 }}>
                {item.big}
                <span style={{ fontSize: item.unit === "%" ? 40 : 20, color: item.unit === "%" ? "var(--ct-ff5a33, #ff5a33)" : "var(--c-c5bdb1, #c5bdb1)" }}>{item.unit}</span>
              </span>
              <span style={{ fontSize: 15, color: "var(--c-d6cfc3, #d6cfc3)" }}>{item.copy}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- compare */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 36 }}>
          {p.compare.title}
          <span>{p.compare.muted}</span>
        </h2>
        <div className="lb-table-wrap lb-reveal">
          <div className="lb-table">
            <div className="lb-trow lb-thead">
              <span style={{ color: "var(--c-c5bdb1, #c5bdb1)", fontWeight: 500 }}>{p.compare.module}</span>
              {p.plans.map((plan, i) => (
                <span key={plan.name} style={{ textAlign: "center", color: rec === i ? "var(--ct-ff7a57, #ff7a57)" : "var(--c-f3efe6, #f3efe6)" }}>
                  {plan.name}
                </span>
              ))}
            </div>
            {p.rows.map((row) => (
              <div key={row.label} className="lb-trow">
                <span style={{ color: "var(--c-d7d0c5, #d7d0c5)" }}>{row.label}</span>
                {row.cells.map((cell, i) => (
                  <span key={i} className="lb-tcell" style={{ background: rec === i ? "rgba(255,90,51,0.1)" : "transparent" }}>
                    {cell === true ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--c-f3efe6, #f3efe6)" }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={p.compare.included}>
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    ) : cell === false ? (
                      <span style={{ color: "var(--c-9a9287, #9a9287)" }} role="img" aria-label={p.compare.notIncluded}>
                        —
                      </span>
                    ) : (
                      <span style={{ fontWeight: 550 }}>{cell}</span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- add-ons */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 36 }}>
          {p.addons.label}
          <span style={{ color: "var(--ct-ff5a33, #ff5a33)" }}>.</span>
        </h2>
        <div className="lb-pr-addons">
          {p.addons.items.map((item) => (
            <div key={item.name} className="lb-reveal lb-pr-addon">
              <span style={{ fontSize: 15, color: "var(--c-d6cfc3, #d6cfc3)" }}>{item.name}</span>
              <span className="lb-display" style={{ fontSize: 40, letterSpacing: "-0.05em", lineHeight: 1 }}>
                {item.price}
                <span style={{ fontSize: 16, color: "var(--c-c5bdb1, #c5bdb1)", letterSpacing: 0, fontFamily: "var(--font-sans)", fontWeight: 400 }}>{item.unit}</span>
              </span>
              <span style={{ marginTop: "auto", fontSize: 15, lineHeight: 1.5, color: "var(--c-d6cfc3, #d6cfc3)" }}>{item.copy}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------- what it doesn't include */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 36 }}>
          {p.excludesTitle} <span>{p.excludesMuted}</span>
        </h2>
        <div className="lb-reveal">
          <Checks items={p.excludes} />
        </div>
      </section>

      {/* -------------------------------------- against the alternatives, by type */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 16 }}>
          {p.altTitle} <span>{p.altMuted}</span>
        </h2>
        <p className="lb-ar-p lb-reveal" style={{ margin: "0 0 32px", maxWidth: 640 }}>
          {p.altIntro}
        </p>
        <DataTable head={p.altHead} rows={p.altRows.map((row) => row.map((cell) => fill(cell, planPrices(t))))} accentCol={4} minWidth={820} />
        <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--c-ada599, #ada599)" }}>{p.altNote}</p>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="lb-pr-block" style={{ paddingTop: 140 }}>
        <div className="lb-faq">
          <h2 className="lb-h2 lb-reveal" style={{ flex: "1 1 300px", fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 1 }}>
            {p.faqTitle}
            <br />
            <span>{p.faqMuted}</span>
          </h2>
          <div className="lb-faq-list">
            {p.faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="lb-faq-item">
                  <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : i)}>
                    <span>{f.q}</span>
                    <span className="lb-faq-plus" style={{ transform: open ? "rotate(45deg)" : "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  {open && <p className="lb-open">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- close */}
      <section className="lb-reserve" id="empezar">
        <div className="lb-reserve-glow" aria-hidden />
        <h2 className="lb-h2-xl lb-reveal" style={{ fontSize: "clamp(48px, 7.5vw, 108px)" }}>
          {p.closing.lead}
          <br />
          <span>{p.plans[rec].name}.</span>
        </h2>
        <p className="lb-reveal" style={{ margin: "26px auto 0", maxWidth: 480, fontSize: 19, lineHeight: 1.5, color: "var(--c-d6cfc3, #d6cfc3)" }}>
          {p.closing.copy}
        </p>
        <div className="lb-hero-ctas lb-reveal">
          <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={() => openLeadForm({ source: "web_form" })}>
            {p.closing.cta}
          </button>
          <Link href="/" className="lb-text-link">
            {p.closing.back}
          </Link>
        </div>
      </section>
    </>
  );
}
