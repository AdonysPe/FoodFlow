"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconClaimsBook, IconInstagram, IconTikTok } from "@/components/ui/Icons";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { LEGAL_HOLDER } from "@/lib/legal/holder";
import { buildWhatsAppUrl } from "@/lib/contact";
import { SOCIAL_LINKS } from "@/lib/social";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The navbar's destinations, in its order: features, panel, calculator,
// pricing, questions, about.
const NAV_HREFS = ["/#features", "/#product", "/calculadora", "/precios", "/preguntas", "/nosotros"];
const LEGAL = ["/terminos", "/privacidad", "/cookies"];
// The five guides stay one click from every page: they are how a restaurant
// owner searching for "alternativa a Rappi" finds the rest of the site.
const GUIDES = ["/comisiones-rappi-pedidosya", "/alternativa-a-rappi", "/vender-sin-comision", "/carta-digital-qr", "/web-de-pedidos"];
const SOCIAL_ICONS = { instagram: IconInstagram, tiktok: IconTikTok };
const MARK = "FoodFlow".split("");

/** Lima's wall clock, read on the client only so the server and the browser never disagree. */
function useLimaClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return null;
  const parts = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const date = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
  const moment = hour >= 5 && hour < 11 ? 0 : hour >= 11 && hour < 16 ? 1 : hour >= 16 && hour < 19 ? 2 : hour >= 19 && hour < 23 ? 3 : 4;
  return { time: `${String(hour).padStart(2, "0")}:${minute}`, date, moment };
}

function Arrow() {
  return (
    <svg className="lb-ft-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/**
 * The footer of every marketing page — the "Cierre del día" prototype: the
 * site map printed as the day's closing ticket (dotted leaders, the 0%
 * commission stamped at the bottom, a barcode), and beside it the live line
 * with Lima's time, "Hasta el próximo turno.", the contact, the legal
 * documents with the Libro de Reclamaciones, the language and the credits.
 * On a phone it ends with the FoodFlow signature: a faint giant wordmark a
 * light sweeps across, and that follows the finger.
 *
 * It animates once, when it scrolls into view; without JavaScript, or with
 * reduced motion, everything is simply there.
 */
export default function LandingFooter() {
  const { t, lang, setLang } = useLanguage();
  const f = t.landing.footer;
  const nav = t.landing.nav;
  const { openLeadForm } = useLeadCapture();
  const clock = useLimaClock();
  const rootRef = useRef(null);
  const sigRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    setArmed(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setInView(true);
      observer.disconnect();
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const guideLabels = [t.commissions.eyebrow, t.rappiAlternative.eyebrow, t.sellDirect.eyebrow, t.qrMenu.eyebrow, t.orderingSite.eyebrow];
  const links = t.nav.links;
  const groups = [
    { title: f.product, items: [
      { label: links[0], href: NAV_HREFS[0] },
      { label: links[1], href: NAV_HREFS[1] },
      { label: links[3], href: NAV_HREFS[3] },
      { label: links[2], href: NAV_HREFS[2] },
      { label: nav.pilot, onClick: () => openLeadForm({ source: "web_form" }) },
    ] },
    { title: f.guides, items: GUIDES.map((href, i) => ({ label: guideLabels[i], href })) },
    { title: f.company, items: [
      { label: links[5], href: NAV_HREFS[5] },
      { label: links[4], href: NAV_HREFS[4] },
      { label: nav.signInPanel, href: "/login" },
    ] },
  ];
  let step = 0;
  const delay = () => ({ "--d": `${(0.7 + step++ * 0.06).toFixed(2)}s` });
  const whatsapp = buildWhatsAppUrl(lang === "en" ? "Hi FoodFlow, I'd like to know more." : "Hola FoodFlow, quiero saber más.");

  const toTop = () => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  // The light on the signature follows the pointer or the finger.
  const follow = (event) => {
    const node = sigRef.current;
    const point = event.touches ? event.touches[0] : event;
    if (!node || !point) return;
    const box = node.getBoundingClientRect();
    node.style.setProperty("--sx", `${(((point.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    node.style.setProperty("--sy", `${(((point.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    node.classList.add("is-live");
  };
  const rest = () => sigRef.current?.classList.remove("is-live");

  return (
    <footer ref={rootRef} className={`lb-ft${armed ? " is-armed" : ""}${inView ? " is-in" : ""}`}>
      <span className="lb-ft-sheen" aria-hidden="true"><span /></span>
      <span className="lb-ft-glow" aria-hidden="true" />

      <div className="lb-ft-inner">
        <nav className="lb-ft-receipt" aria-label={f.siteMap}>
          <div className="lb-ft-print">
          <div className="lb-ft-paper">
            <div className="lb-ft-head">
              <span className="lb-ft-brand">FOODFLOW</span>
              <span>{f.place.replace("FoodFlow · ", "")} · foodflow.site</span>
              {clock && <span>{clock.date} · {clock.time}</span>}
            </div>
            <div className="lb-ft-dash" aria-hidden="true" />
            {groups.map((group) => (
              <div key={group.title} className="lb-ft-group">
                <span className="lb-ft-line lb-ft-group-title" style={delay()}>{group.title}</span>
                {group.items.map((item) => {
                  const inner = <>
                    <span>{item.label}</span>
                    <span className="lb-ft-lead" aria-hidden="true" />
                    <span className="lb-ft-go" aria-hidden="true">→</span>
                  </>;
                  return item.href
                    ? <Link key={item.label} href={item.href} prefetch={false} className="lb-ft-row lb-ft-line" style={delay()}>{inner}</Link>
                    : <button key={item.label} type="button" onClick={item.onClick} className="lb-ft-row lb-ft-line" style={delay()}>{inner}</button>;
                })}
              </div>
            ))}
            <div className="lb-ft-double" aria-hidden="true" />
            <div className="lb-ft-total">
              <span>{f.commission}</span>
              <span className="lb-ft-lead lb-ft-lead--solid" aria-hidden="true" />
              <span className="lb-ft-stamp">0%</span>
            </div>
            <p className="lb-ft-bye">{f.receiptBye}</p>
            <div className="lb-ft-barcode" aria-hidden="true" />
          </div>
          <div className="lb-ft-zig" aria-hidden="true" />
          </div>
        </nav>

        <div className="lb-ft-side">
          <div className="lb-ft-top">
            <p className="lb-ft-live lb-ft-rise" style={{ "--d": ".2s" }}>
              <span className="lb-ft-dot" aria-hidden="true" />
              <span>
                {f.city}
                {clock && <> · <span className="lb-mono lb-ft-time">{clock.time}</span> · {f.moments[clock.moment]}</>}
              </span>
            </p>
            <button type="button" className="lb-ft-up lb-ft-rise" style={{ "--d": ".25s" }} onClick={toTop} aria-label={f.backToTop} title={f.backToTop}>
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="21" fill="none" stroke="rgba(243,239,230,.16)" strokeWidth="1" />
                <circle className="lb-ft-arc" cx="22" cy="22" r="21" fill="none" stroke="#ff5a33" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-90 22 22)" />
              </svg>
              <Arrow />
            </button>
          </div>

          <p className="lb-ft-title">
            <span className="sr-only">{`${[...f.closing, ...f.closingMuted].join(" ")}.`}</span>
            {f.closing.map((word, i) => <span key={`a${i}`} aria-hidden="true"><span className="lb-ft-word" style={{ "--d": `${(0.35 + i * 0.1).toFixed(2)}s` }}>{word}</span>{" "}</span>)}
            <br />
            {f.closingMuted.map((word, i) => <span key={`b${i}`} aria-hidden="true" className="lb-ft-word lb-ft-muted" style={{ "--d": `${(0.75 + i * 0.1).toFixed(2)}s` }}>{word}</span>)}
            <span aria-hidden="true" className="lb-ft-word lb-ft-period" style={{ "--d": "1.05s" }}>.</span>
          </p>

          <div className="lb-ft-cols">
            <div className="lb-ft-col lb-ft-rise" style={{ "--d": ".6s" }}>
              <h2 className="lb-ft-h">{f.contact}</h2>
              <a href={`mailto:${LEGAL_HOLDER.email}`} className="lb-ft-link">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4 7l8 6 8-6" /></svg>
                {LEGAL_HOLDER.email}
              </a>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="lb-ft-link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.4 18.6z" /></svg>
                  WhatsApp
                </a>
              )}
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.id];
                return (
                  <a key={social.id} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} ${social.handle}`} className="lb-ft-link">
                    {Icon && <Icon className="h-4 w-4" />}
                    {social.handle}
                  </a>
                );
              })}
            </div>
            <div className="lb-ft-col lb-ft-rise" style={{ "--d": ".7s" }}>
              <h2 className="lb-ft-h">{f.legalTitle}</h2>
              {f.legal.map((label, i) => (
                <Link key={LEGAL[i]} href={LEGAL[i]} prefetch={false} className="lb-ft-link">{label}</Link>
              ))}
              <Link href="/libro-de-reclamaciones" prefetch={false} className="lb-ft-link">
                <IconClaimsBook className="h-4 w-4 lb-ft-book" />
                {f.claims}
              </Link>
            </div>
          </div>

          <div className="lb-ft-fine lb-ft-rise" style={{ "--d": ".8s" }}>
            <span className="lb-ft-credits">
              <span>© {new Date().getFullYear()} {f.place}</span>
              <span>{f.photos}</span>
            </span>
            <span className="lb-ft-lang" role="group" aria-label={f.language}>
              {["es", "en"].map((code, i) => (
                <button key={code} type="button" aria-pressed={lang === code} className={lang === code ? "is-on" : undefined} onClick={() => setLang(code)}>
                  {f.languages[i]}
                </button>
              ))}
            </span>
          </div>
        </div>

        <div
          ref={sigRef}
          className="lb-ft-sig"
          aria-hidden="true"
          onPointerMove={follow}
          onPointerLeave={rest}
          onTouchMove={follow}
          onTouchEnd={rest}
        >
          <div className="lb-ft-sig-text">
            <span className="lb-ft-sig-base">
              {MARK.map((letter, i) => <span key={i} className="lb-ft-letter" style={{ "--d": `${(1.4 + i * 0.06).toFixed(2)}s` }}>{letter}</span>)}
              <i className="lb-ft-sig-dot" />
            </span>
            <span className="lb-ft-sig-lit">
              {MARK.map((letter, i) => <span key={i} className="lb-ft-letter" style={{ "--d": `${(1.4 + i * 0.06).toFixed(2)}s` }}>{letter}</span>)}
              <i className="lb-ft-sig-gap" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
