"use client";

import Link from "next/link";
import { IconClaimsBook, IconInstagram, IconTikTok } from "@/components/ui/Icons";
import { SOCIAL_LINKS } from "@/lib/social";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const LINKS = ["/calculadora", "/preguntas", "/nosotros", "/login"];
const LEGAL = ["/terminos", "/privacidad", "/cookies"];
// The five guides stay one click from every page: they are how a restaurant
// owner searching for "alternativa a Rappi" finds the rest of the site.
const GUIDES = ["/comisiones-rappi-pedidosya", "/alternativa-a-rappi", "/vender-sin-comision", "/carta-digital-qr", "/web-de-pedidos"];
const SOCIAL_ICONS = { instagram: IconInstagram, tiktok: IconTikTok };

/**
 * The home page's footer: the prototype's single line (place, four links,
 * photo credits), plus a second quiet line with what a Peruvian consumer
 * must always be able to reach — the three legal documents and the
 * Libro de Reclamaciones — and the social profiles, plus a row with the five
 * guides. It is the footer of every marketing page.
 */
export default function LandingFooter() {
  const { t } = useLanguage();
  const f = t.landing.footer;
  const guideLabels = [t.commissions.eyebrow, t.rappiAlternative.eyebrow, t.sellDirect.eyebrow, t.qrMenu.eyebrow, t.orderingSite.eyebrow];

  return (
    <footer className="lb-footer">
      <div className="lb-footer-row">
        <span>
          © {new Date().getFullYear()} {f.place}
        </span>
        <span className="lb-footer-links">
          {f.links.map((label, i) => (
            <Link key={LINKS[i]} href={LINKS[i]}>
              {label}
            </Link>
          ))}
        </span>
        <span>{f.photos}</span>
      </div>
      <div className="lb-footer-row">
        <span className="lb-footer-links">
          <span className="lb-mono lb-footer-label">{f.guides}</span>
          {GUIDES.map((href, i) => (
            <Link key={href} href={href}>
              {guideLabels[i]}
            </Link>
          ))}
        </span>
      </div>
      <div className="lb-footer-row">
        <span className="lb-footer-links">
          {f.legal.map((label, i) => (
            <Link key={LEGAL[i]} href={LEGAL[i]}>
              {label}
            </Link>
          ))}
          <Link href="/libro-de-reclamaciones" className="lb-claims">
            <IconClaimsBook className="h-4 w-4" />
            {f.claims}
          </Link>
        </span>
        <span className="lb-footer-links">
          {SOCIAL_LINKS.map((s) => {
            const Icon = SOCIAL_ICONS[s.id];
            return (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.label} ${s.handle}`}
                className="lb-claims"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {s.handle}
              </a>
            );
          })}
        </span>
      </div>
    </footer>
  );
}
