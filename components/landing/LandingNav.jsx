"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";

// Same destinations and translated labels as the site's shared navbar.
const HREFS = ["/#features", "/#product", "/calculadora", "/precios", "/preguntas", "/nosotros"];
// What each module in the "Qué incluye" panel opens: its guide when it has
// one, otherwise the part of the home page that shows it.
const FEATURE_HREFS = ["/carta-digital-qr", "/#features", "/#features", "/web-de-pedidos", "/#product"];
// The five guides, in the footer's order.
const GUIDE_HREFS = ["/comisiones-rappi-pedidosya", "/alternativa-a-rappi", "/vender-sin-comision", "/carta-digital-qr", "/web-de-pedidos"];

function IconPerson({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="lb-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * The public site's header, Apple-style over design B: a thin frosted bar
 * that tightens once the page scrolls, a "Qué incluye" panel that drops from
 * the bar on desktop (modules, the five guides and where to start) while the
 * page behind blurs, and on phones a full-screen menu that opens from a
 * two-line button, with Entrar both in the bar and as a button in the menu.
 *
 * "Reservar" opens the same lead form the rest of the site uses.
 */
export default function LandingNav() {
  const { t, lang, setLang } = useLanguage();
  const nav = t.landing.nav;
  const links = t.nav.links.map((label, i) => ({ label, href: HREFS[i] }));
  const guides = [t.commissions.eyebrow, t.rappiAlternative.eyebrow, t.sellDirect.eyebrow, t.qrMenu.eyebrow, t.orderingSite.eyebrow].map((label, i) => ({ label, href: GUIDE_HREFS[i] }));
  const features = nav.features.map((label, i) => ({ label, href: FEATURE_HREFS[i] }));
  const { openLeadForm } = useLeadCapture();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const [fly, setFly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const whatsapp = buildWhatsAppUrl(lang === "en" ? "Hi FoodFlow, I'd like to know more." : "Hola FoodFlow, quiero saber más.");

  // The bar tightens after the first few pixels. Captured on the document so
  // it hears the scroll whichever element ends up scrolling the page.
  useEffect(() => {
    const read = () => {
      const top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      setScrolled(top > 24);
    };
    read();
    document.addEventListener("scroll", read, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", read, { capture: true });
  }, []);

  // Escape closes whatever is open; the phone menu also closes when the
  // viewport grows past the breakpoint, and holds the page still while open.
  useEffect(() => {
    if (!open && !fly) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setFly(false);
    };
    const onResize = () => window.innerWidth > 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const html = document.documentElement;
    const previous = html.style.overflow;
    if (open) html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      html.style.overflow = previous;
    };
  }, [open, fly]);

  const closeAll = () => {
    setOpen(false);
    setSub(false);
    setFly(false);
  };
  const reserve = () => {
    closeAll();
    openLeadForm({ source: "web_form" });
  };

  return (
    <>
      <header
        className={`lb-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}${fly ? " is-fly" : ""}`}
        onMouseLeave={() => setFly(false)}
      >
        <nav className="lb-nav" aria-label="Principal">
          <Link href="/#inicio" className="lb-logo" onClick={closeAll}>
            FoodFlow
            <span className="lb-logo-dot" aria-hidden />
          </Link>

          <ul className="lb-nav-links">
            <li>
              <button
                type="button"
                className={`lb-nav-trigger${fly ? " is-on" : ""}`}
                aria-expanded={fly}
                aria-controls="lb-fly"
                onMouseEnter={() => setFly(true)}
                onClick={() => setFly((v) => !v)}
              >
                {links[0].label}
                <Chevron />
              </button>
            </li>
            {links.slice(1).map(({ label, href }) => (
              <li key={href}>
                <Link href={href} prefetch={false} onMouseEnter={() => setFly(false)} onClick={closeAll}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="lb-nav-right">
            <button
              type="button"
              className="lb-lang"
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              aria-label={lang === "en" ? `Switch to ${t.nav.langName}` : `Cambiar a ${t.nav.langName}`}
            >
              {t.nav.langToggle}
            </button>
            <Link href="/login" className="lb-nav-signin" onMouseEnter={() => setFly(false)}>
              {nav.signIn}
            </Link>
            <Link href="/login" className="lb-nav-person" aria-label={nav.signInPanel} title={nav.signIn}>
              <span>
                <IconPerson size={15} />
              </span>
            </Link>
            <button type="button" className="lb-pill-btn lb-pill-btn--sm lb-nav-reserve" onClick={reserve}>
              {nav.reserve}
            </button>
            <button
              type="button"
              className={`lb-menu-btn${open ? " is-open" : ""}`}
              aria-expanded={open}
              aria-controls="lb-mobile-menu"
              aria-label={open ? nav.closeMenu : nav.openMenu}
              onClick={() => {
                setOpen((v) => !v);
                setSub(false);
              }}
            >
              <i aria-hidden />
              <i aria-hidden />
            </button>
          </div>
        </nav>

        {fly && (
          <div id="lb-fly" className="lb-fly">
            <div className="lb-fly-grid">
              <div className="lb-fly-col">
                <span className="lb-fly-h" style={{ animationDelay: ".02s" }}>{nav.included}</span>
                {features.map(({ label, href }, i) => (
                  <Link key={label} href={href} prefetch={false} className="lb-fly-big" style={{ animationDelay: `${0.04 + i * 0.04}s` }} onClick={closeAll}>
                    {label}
                  </Link>
                ))}
              </div>
              <div className="lb-fly-col">
                <span className="lb-fly-h" style={{ animationDelay: ".06s" }}>{nav.guides}</span>
                {guides.map(({ label, href }, i) => (
                  <Link key={href} href={href} prefetch={false} className="lb-fly-small" style={{ animationDelay: `${0.08 + i * 0.035}s` }} onClick={closeAll}>
                    {label}
                  </Link>
                ))}
              </div>
              <div className="lb-fly-col">
                <span className="lb-fly-h" style={{ animationDelay: ".1s" }}>{nav.start}</span>
                <Link href="/calculadora" prefetch={false} className="lb-fly-small" style={{ animationDelay: ".14s" }} onClick={closeAll}>
                  {nav.calculator}
                </Link>
                <Link href="/precios" prefetch={false} className="lb-fly-small" style={{ animationDelay: ".18s" }} onClick={closeAll}>
                  {nav.pricing}
                </Link>
                <button type="button" className="lb-fly-small lb-fly-accent" style={{ animationDelay: ".22s" }} onClick={reserve}>
                  {nav.pilot} ›
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {fly && <div className="lb-fly-veil" aria-hidden onClick={() => setFly(false)} />}

      {open && (
        <div className="lb-sheet">
          <nav id="lb-mobile-menu" className="lb-sheet-menu" aria-label={nav.openMenu}>
            <ul>
              <li style={{ animationDelay: ".05s" }}>
                <button type="button" className={`lb-sheet-big lb-sheet-toggle${sub ? " is-on" : ""}`} aria-expanded={sub} aria-controls="lb-sheet-sub" onClick={() => setSub((v) => !v)}>
                  {links[0].label}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {sub && (
                  <ul id="lb-sheet-sub" className="lb-sheet-sub">
                    {features.map(({ label, href }, i) => (
                      <li key={label} style={{ animationDelay: `${i * 0.04}s` }}>
                        <Link href={href} prefetch={false} onClick={closeAll}>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              {links.slice(1).map(({ label, href }, i) => (
                <li key={href} style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  <Link href={href} prefetch={false} className="lb-sheet-big" onClick={closeAll}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="lb-sheet-foot">
              <div className="lb-sheet-row">
                <Link href="/login" className="lb-sheet-signin" onClick={closeAll}>
                  <IconPerson size={18} />
                  {nav.signInPanel}
                </Link>
                <div className="lb-sheet-lang" role="group" aria-label={nav.language}>
                  {["es", "en"].map((code) => (
                    <button key={code} type="button" aria-pressed={lang === code} className={lang === code ? "is-on" : undefined} onClick={() => setLang(code)}>
                      {code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="lb-sheet-cta" onClick={reserve}>
                {nav.pilot}
              </button>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="lb-sheet-wa" onClick={closeAll}>
                  {nav.whatsapp}
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
