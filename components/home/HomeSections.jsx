"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The home page below the hero. Every motion here is scroll-driven CSS
 * (app/home.css): sticky "scenes" pin while a view timeline plays them, and
 * everything else rises in as it enters view. Without support for scroll
 * timelines, or with reduced motion on, each section renders in its final,
 * readable state — the copy is always real text in the HTML.
 */

function Check({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Title({ title, muted, className = "lb-h2", id }) {
  return (
    <h2 className={className} id={id}>
      {title}
      <span className="lh-block">{muted}</span>
    </h2>
  );
}

/* ------------------------------------------------------------ ribbon */

export function Ribbon() {
  const { t } = useLanguage();
  const items = t.landing.marquee;
  const lead = items.slice(0, -1);
  const last = items[items.length - 1];
  return (
    <section className="lh-ribbon" aria-label={t.landing.nav.included}>
      <p className="lh-row lh-go-l">
        {lead.map((item, i) => (
          <span key={item}>
            {item}
            {i < lead.length - 1 && <b aria-hidden> · </b>}
          </span>
        ))}
      </p>
      <p className="lh-row lh-outline lh-go-r">
        <span>{last}</span>
        <span aria-hidden> · {last} · {last}</span>
      </p>
    </section>
  );
}

/* ------------------------------------------------------ QR zoom-through */

// A 25×25 QR-style pattern: the three finder squares plus seeded noise,
// with a quiet centre for the logo the scroll zooms into. Built once, at
// import, so it is plain markup by the time it renders.
const QR_PATH = (() => {
  const n = 25;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const corners = [[0, 0], [0, n - 7], [n - 7, 0]];
  const finder = (r, c) => {
    for (const [fr, fc] of corners) {
      const rr = r - fr;
      const cc = c - fc;
      if (rr >= 0 && rr < 7 && cc >= 0 && cc < 7) {
        const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6;
        const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
        return ring || core ? 1 : 0;
      }
      if (rr >= -1 && rr <= 7 && cc >= -1 && cc <= 7) return 0;
    }
    return -1;
  };
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const f = finder(r, c);
      const quiet = r >= 9 && r <= 15 && c >= 9 && c <= 15;
      const on = f === -1 ? !quiet && rnd() < 0.5 : f === 1;
      if (on) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return d;
})();

export function QrScene() {
  const { t } = useLanguage();
  const q = t.landing.scenes.qr;
  return (
    <section className="lh-qr-track" aria-labelledby="lh-qr-title">
      <div className="lh-scene lh-qr-stage">
        <div className="lh-qr-layer">
          <div className="lh-qr-text">
            <p className="lh-tag">{q.eyebrow}</p>
            <h2 id="lh-qr-title" className="lb-h2">
              {q.title} <span>{q.titleMuted}</span>
            </h2>
          </div>
          <div className="lh-qr-box">
            <svg viewBox="0 0 25 25" role="img" aria-label={q.aria}>
              <path d={QR_PATH} fill="#0c0908" />
              <rect x="11" y="11" width="3" height="3" transform="rotate(45 12.5 12.5)" fill="#ff5a33" />
            </svg>
          </div>
        </div>
        <div className="lh-carta-layer">
          <div className="lh-qr-phone">
            <div className="lh-qr-phone-in">
              <div className="lh-notch" />
              <span className="lb-eyebrow">{q.table}</span>
              <span className="lh-phone-title">{q.heading}</span>
              {q.dishes.map((dish, i) => (
                <div key={dish.name} className="lh-dish" style={{ "--i": i }}>
                  <span>
                    {dish.name}
                    <small>{dish.group}</small>
                  </span>
                  <span className="lh-inline">
                    {dish.price}
                    <span className="lh-add" aria-hidden>
                      +
                    </span>
                  </span>
                </div>
              ))}
              <p className="lh-note lh-center">{q.foot}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------- three screens, one order */

export function Story() {
  const { t } = useLanguage();
  const s = t.landing.story;
  const sc = t.landing.scenes;
  const [guest, kitchen, owner] = s.cards;
  return (
    <section className="lh-story">
      <span id="product" className="lb-anchor" aria-hidden />
      <div className="lh-story-track">
        <div className="lh-story-stage">
          <div className="lh-wrap">
            <div className="lb-head-row">
              <Title title={s.title} muted={s.titleMuted} />
              <p className="lb-lede">{s.lede}</p>
            </div>

            <div className="lh-steps" aria-hidden>
              {s.steps.map((step, i) => (
                <span key={step} className={`lh-c${i + 1}`}>
                  <em>{i + 1}</em>
                  {step}
                </span>
              ))}
            </div>

            <div className="lh-screens">
              <article className="lb-card lh-scr lh-c1">
                <span className="lb-eyebrow">{guest.eyebrow}</span>
                <h3 className="lh-scr-title">{guest.title}</h3>
                <p className="lh-scr-copy">{guest.copy}</p>
                <div className="lh-mini">
                  {s.phone.items.map((item) => (
                    <div key={item.name} className="lh-line">
                      <span>1 × {item.name}</span>
                      <span>{item.price}</span>
                    </div>
                  ))}
                  <span className="lh-swap">
                    <span className="lh-send lh-send-a">
                      {s.phone.send} · {s.phone.total}
                    </span>
                    <span className="lh-sent lh-send-b">
                      <Check />
                      {s.phone.sent}
                    </span>
                  </span>
                </div>
              </article>

              <article className="lb-card lh-scr lh-c2">
                <span className="lb-eyebrow">{kitchen.eyebrow}</span>
                <h3 className="lh-scr-title">{kitchen.title}</h3>
                <p className="lh-scr-copy">{kitchen.copy}</p>
                <div className="lh-mini">
                  <div className="lh-between">
                    <b>{s.kitchen.ticket}</b>
                    <span className="lh-chips">
                      <span className="lh-st is-new lh-k0">{s.kitchen.states[0]}</span>
                      <span className="lh-st is-fire lh-k1">{s.kitchen.states[1]}</span>
                      <span className="lh-st is-ok lh-k2">{s.kitchen.states[2]}</span>
                    </span>
                  </div>
                  <p className="lh-note">{s.kitchen.source}</p>
                  {s.kitchen.lines.map((line) => (
                    <div key={line} className="lh-dim">
                      {line}
                    </div>
                  ))}
                  <div className="lh-tk lh-faded">
                    <span>
                      {s.kitchen.other} · {s.kitchen.otherLine}
                    </span>
                  </div>
                </div>
              </article>

              <article className="lb-card lh-scr lh-c3">
                <span className="lb-eyebrow">{owner.eyebrow}</span>
                <h3 className="lh-scr-title">{owner.title}</h3>
                <p className="lh-scr-copy">{owner.copy}</p>
                <div className="lh-mini">
                  <span className="lb-eyebrow">{s.panel.sales}</span>
                  <span className="lh-swap lh-sales">
                    <span className="lh-sales-a">{s.panel.before}</span>
                    <span className="lh-sales-b">
                      {s.panel.after} <small>{s.panel.plus}</small>
                    </span>
                  </span>
                  <div className="lh-res lh-sales-b">
                    <span>{s.panel.newest.label}</span>
                    <b>{s.panel.newest.amount}</b>
                  </div>
                  <div className="lh-res lh-muted">
                    <span>{s.panel.others[0].label}</span>
                    <span>{s.panel.others[0].amount}</span>
                  </div>
                  <div className="lh-toast">
                    <span>{s.panel.paid}</span>
                    <span>{s.panel.paidAmount}</span>
                  </div>
                </div>
              </article>
            </div>

            <div className="lh-rail" aria-hidden>
              <div className="lh-rail-line" />
              <div className="lh-rail-fill" />
              <div className="lh-fly">{sc.storyTicket}</div>
            </div>
            <p className="lh-note">{sc.storyNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- manifesto */

export function Manifesto() {
  const { t } = useLanguage();
  return (
    <section className="lh-manifesto">
      <div className="lh-wrap">
        <p className="lh-mf">
          {t.landing.scenes.manifesto.map((line, i) => (
            <span key={i}>{line} </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------- a day, side to side */

export function DayScene() {
  const { t } = useLanguage();
  const day = t.landing.scenes.day;
  return (
    <section className="lh-day-track" aria-labelledby="lh-day-title">
      {/* The sky is night-to-night whatever the site theme: a dark island. */}
      <div className="lh-scene lh-sky" data-theme="dark">
        <div className="lh-stars" aria-hidden />
        <div className="lh-arm" aria-hidden>
          <span className="lh-sun" />
        </div>
        <div className="lh-horizon" aria-hidden />
        <h2 id="lh-day-title" className="lh-sr">
          {day.title}
        </h2>
        <div className="lh-strip">
          {day.moments.map((m) => (
            <div key={m.time} className="lh-moment">
              <div className="lh-wrap">
                <p className="lh-tag">{m.label}</p>
                <p className="lh-clock">{m.time}</p>
                <h3>{m.title}</h3>
                <p>{m.copy}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="lh-day-dots" aria-hidden>
          {day.moments.map((m) => (
            <span key={m.time}>
              <i />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- modules */

export function Modules() {
  const { t } = useLanguage();
  const m = t.landing.modules;
  const ROOM = ["busy", "bill", "free", "busy", "free", "busy", "busy", "free"];
  return (
    <section className="lh-section" id="modulos">
      <span id="features" className="lb-anchor" aria-hidden />
      <div className="lh-wrap">
        <Title title={m.title} muted={m.titleMuted} />
        <div className="lh-bento">
          <article className="lb-card lh-bx lh-span4 lh-menu-card lh-reveal">
            <span className="lb-eyebrow">{m.menu.eyebrow}</span>
            <h3>{m.menu.title}</h3>
            <p>{m.menu.copy}</p>
            <div className="lh-menu-grid">
              <div>
                <div className="lh-toggle-row">
                  <span>{m.menu.dishes[0]}</span>
                  <span className="lh-tg is-on" role="img" aria-label={m.menu.available}>
                    <i />
                  </span>
                </div>
                <div className="lh-toggle-row">
                  <span>{m.menu.dishes[1]}</span>
                  <span className="lh-tg lh-tg-off" role="img" aria-label={m.menu.soldOutToday}>
                    <i />
                  </span>
                </div>
              </div>
              <div className="lh-mtables">
                {m.menu.tables.map((table) => (
                  <div key={table} className="lh-mt">
                    {table}
                    <span className="lh-dish-off">{m.menu.dishes[1]}</span>
                    <span className="lh-so">{m.menu.soldOut}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="lb-card lh-bx lh-span2 lh-reveal lh-d1">
            <span className="lb-eyebrow">{m.room.eyebrow}</span>
            <h3>{m.room.title}</h3>
            <p>{m.room.copy}</p>
            <div className="lh-room">
              {ROOM.map((state, i) => (
                <span key={i} className={`lh-tb is-${state}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
            <div className="lh-legend">
              {m.room.legend.map((label, i) => (
                <span key={label} className={`is-${["busy", "bill", "free"][i]}`}>
                  <i aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </article>

          <article className="lb-card lh-bx lh-span2 lh-reveal">
            <span className="lb-eyebrow">{m.team.eyebrow}</span>
            <h3>{m.team.title}</h3>
            <div className="lh-push">
              {m.team.roles.map((role) => (
                <div key={role.role} className="lh-res">
                  <b>{role.role}</b>
                  <span className="lh-muted">{role.sees}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="lb-card lh-bx lh-span2 lh-reveal lh-d1">
            <span className="lb-eyebrow">{m.web.eyebrow}</span>
            <h3>{m.web.title}</h3>
            <p>{m.web.copy}</p>
            <div className="lh-push lh-stack">
              <span className="lh-url">{m.web.url}</span>
              <div className="lh-tk lh-tk-mint">
                <span>{m.web.toast}</span>
                <span>{m.web.toastTo}</span>
              </div>
            </div>
          </article>

          <article className="lb-card lh-bx lh-span2 lh-reveal lh-d2">
            <span className="lb-eyebrow">{m.bookings.eyebrow}</span>
            <h3>{m.bookings.title}</h3>
            <p>{m.bookings.copy}</p>
            <div className="lh-push">
              {m.bookings.rows.map((row) => (
                <div key={row.table} className="lh-res">
                  <b>{row.table}</b>
                  <span className="lh-muted">{row.who}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 30% → 0% */

export function Commission() {
  const { t } = useLanguage();
  const c = t.landing.scenes.commission;
  const ledger = t.landing.pilot.ledger;
  return (
    <section className="lh-comm" aria-labelledby="lh-comm-title">
      <div className="lh-comm-track">
        <div className="lh-comm-stage">
          <div className="lh-wrap lh-comm-grid">
            <div>
              <span className="lb-eyebrow">{ledger.eyebrow}</span>
              <h2 id="lh-comm-title" className="lh-sr">
                {c.title}
              </h2>
              <span className="lh-pct" aria-hidden />
              <div className="lh-plabel" aria-hidden>
                <span className="lh-p0">{c.apps}</span>
                <span className="lh-p1">{c.ours}</span>
              </div>
              <p className="lb-lede lh-comm-copy">{c.copy}</p>
            </div>
            <div className="lb-card lh-ledger">
              <div className="lh-lg-head">
                {ledger.head.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              {ledger.rows.map((row) => (
                <div key={row.label} className="lh-lg-row">
                  <span>{row.label}</span>
                  <span className="lh-zero">{ledger.fee}</span>
                  <span>{row.amount}</span>
                </div>
              ))}
              <div className="lh-lg-total">
                <span>{ledger.totalLabel}</span>
                <span>{ledger.totals[ledger.totals.length - 1]}</span>
              </div>
              <p className="lh-note">{ledger.note}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- pilot */

export function Pilot() {
  const { t } = useLanguage();
  const p = t.landing.pilot;
  return (
    <section id="piloto" className="lh-section lh-pilot">
      <div className="lh-wrap">
        <div className="lb-head-row">
          <div>
            <span className="lb-eyebrow">{p.eyebrow}</span>
            <p className="lh-h48">
              48<small> {t.landing.scenes.pilotUnit}</small>
            </p>
          </div>
          <p className="lb-lede">{p.copy}</p>
        </div>
        <div className="lh-ptrack">
          <div className="lh-pline" aria-hidden />
          <div className="lh-pfill" aria-hidden />
          {p.steps.map((step, i) => (
            <div key={step.title} className={`lh-pstep lh-p${i + 1}`}>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          ))}
        </div>
        <div className="lh-chips-row">
          {p.chips.map((chip) => (
            <span key={chip} className="lh-chip">
              <Check size={13} />
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- plans */

export function Plans() {
  const { t } = useLanguage();
  const p = t.landing.plans;
  const { openLeadForm } = useLeadCapture();
  const prices = t.chat.plans.items.map((plan) => plan.price);
  return (
    <section id="planes" className="lh-section lh-plans">
      <div className="lh-wrap">
        <Title title={p.title} muted={p.titleMuted} />
        <div className="lh-pgrid">
          {p.items.map((plan, i) => {
            const featured = i === 1;
            return (
              <article key={plan.name} className={`lb-card lh-plan lh-plan-${i + 1}${featured ? " is-featured" : ""}`}>
                {featured && <span className="lh-pop">{p.popular}</span>}
                <h3>{plan.name}</h3>
                <p className="lh-price">{prices[i]}</p>
                <p className="lh-per">{p.period}</p>
                <p className="lh-plan-copy">{plan.copy}</p>
                {featured && (
                  <button type="button" className="lb-pill-btn lh-plan-btn" onClick={() => openLeadForm({ source: "web_form" })}>
                    {t.landing.reserve.cta}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <p className="lh-pnote">{p.note}</p>
        <Link href="/precios" className="lb-link-accent lh-compare">
          {p.compare}
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------ closing: no paper slips */

// Paper slips that blow away as the headline lands: start offset (left/top
// in %), where they fly to, and their spin.
const SLIPS = [
  [44, 40, -620, -420, -14], [50, 36, 560, -460, 18], [38, 46, -780, 60, 8],
  [56, 44, 760, 120, -22], [47, 50, -240, 520, 30], [52, 48, 300, 540, -6],
  [41, 34, -420, -600, 24], [58, 38, 680, -260, -30], [46, 42, 60, -640, 4],
  [35, 52, -700, 400, -18],
];
const TILTS = [-12, 8, -6, 14, -10, 6, -14, 10, -4, 12, -8, 6, -20, 9, -7];

/**
 * The closing call. /#cta and /#contacto still land here (other pages link
 * to them), and arriving on /#contacto also opens the lead form, because
 * that is what the other pages' "Reservar mi plaza" promises.
 */
export function Closing() {
  const { t } = useLanguage();
  const r = t.landing.reserve;
  const c = t.landing.scenes.closing;
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

  const letters = [...c.title];
  return (
    <section id="reserva" className="lh-pap-track" aria-labelledby="lh-pap-title">
      <span id="cta" className="lb-anchor" aria-hidden />
      <span id="contacto" className="lb-anchor" aria-hidden />
      <div className="lh-scene lh-pap-stage">
        {SLIPS.map(([left, top, x, y, rot], i) => (
          <span
            key={i}
            className="lh-slip"
            style={{ left: `${left}%`, top: `${top}%`, "--x": `${x}px`, "--y": `${y}px`, "--r": `${rot}deg` }}
            aria-hidden
          >
            <i />
            <i />
            <i />
            <i />
          </span>
        ))}
        <p className="lh-tag">{c.eyebrow}</p>
        <h2 id="lh-pap-title" className="lh-pap-big" aria-label={c.title}>
          <span aria-hidden>
            {letters.map((ch, i) =>
              ch === " " ? (
                " "
              ) : (
                <span
                  key={i}
                  className={`lh-ch${i === letters.length - 1 && ch === "." ? " lh-accent" : ""}`}
                  style={{ "--i": i, "--r": `${TILTS[i % TILTS.length]}deg` }}
                >
                  {ch}
                </span>
              )
            )}
          </span>
        </h2>
        <div className="lh-pap-cta">
          <p className="lb-lede lh-center">{r.copy}</p>
          <div className="lh-ctas">
            <button type="button" className="lb-pill-btn lb-pill-btn--lg" onClick={reserve}>
              {r.cta}
            </button>
            <Link href="/precios" className="lb-text-link">
              {r.plans}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
