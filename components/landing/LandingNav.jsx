"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { IconMenu, IconX } from "@/components/ui/Icons";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Same destinations and translated labels as the site's shared navbar.
const HREFS = ["/#features", "/#product", "/calculadora", "/precios", "/preguntas", "/nosotros"];

/**
 * The home page's own header, as the prototype draws it: wordmark with the
 * vermilion dot, the six original links, Entrar, and the Reservar pill. Two
 * things the prototype leaves out are kept so no flow breaks: the language
 * switch, and a menu for phones and tablets (up to 1024px).
 *
 * "Reservar" opens the same lead form the rest of the site uses.
 */
export default function LandingNav() {
  const { t } = useLanguage();
  const nav = t.landing.nav;
  const links = t.nav.links.map((label, i) => ({ label, href: HREFS[i] }));
  const { openLeadForm } = useLeadCapture();
  const [open, setOpen] = useState(false);

  // Close the phone menu with Escape, and whenever the viewport grows past
  // the breakpoint (a rotated tablet would otherwise keep it open).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const reserve = () => {
    setOpen(false);
    openLeadForm({ source: "web_form" });
  };

  return (
    <header className={`lb-header${open ? " is-open" : ""}`}>
      <nav className="lb-nav" aria-label="Principal">
        <Link href="/#inicio" className="lb-logo" onClick={() => setOpen(false)}>
          FoodFlow
          <span className="lb-logo-dot" aria-hidden />
        </Link>

        <div className="lb-nav-links">
          {links.map(({ label, href }) => (
            <Link key={href} href={href} prefetch={false}>
              {label}
            </Link>
          ))}
          <Link href="/login">{nav.signIn}</Link>
        </div>

        <div className="lb-nav-right">
          <LanguageToggle className="lb-lang" />
          <button type="button" className="lb-pill-btn lb-pill-btn--sm" onClick={reserve}>
            {nav.reserve}
          </button>
          <button
            type="button"
            className="lb-menu-btn"
            aria-expanded={open}
            aria-controls="lb-mobile-menu"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div id="lb-mobile-menu" className="lb-mobile-menu">
        {links.map(({ label, href }) => (
          <Link key={href} href={href} prefetch={false} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
        <Link href="/login" onClick={() => setOpen(false)}>
          {nav.signIn}
        </Link>
        <button type="button" className="lb-pill-btn" onClick={reserve}>
          {nav.reserve}
        </button>
      </div>
    </header>
  );
}
