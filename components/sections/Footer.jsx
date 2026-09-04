"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import { LogoMark } from "@/components/ui/Logo";
import { IconClaimsBook, IconMail } from "@/components/ui/Icons";
import { LEGAL_HOLDER } from "@/lib/legal/holder";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Everything a Peruvian consumer has to be able to find without hunting:
 * who is behind the service, where they are, how to write to them, the three
 * legal documents, and the complaints book.
 *
 * The identity block reads from `lib/legal/holder`, the same source the legal
 * documents use, so the footer can never end up naming someone the terms do
 * not.
 */
export default function Footer() {
  const { t } = useLanguage();

  const legalLinks = [
    { href: "/terminos", label: "Términos y Condiciones" },
    { href: "/privacidad", label: "Política de Privacidad" },
    { href: "/cookies", label: "Política de Cookies" },
  ];

  const siteLinks = [
    { href: "/precios", label: t.pricing.eyebrow },
    { href: "/calculadora", label: t.calculator.eyebrow },
    { href: "/preguntas", label: t.faq.eyebrow },
    { href: "/nosotros", label: t.about.eyebrow },
  ];

  return (
    <footer className="relative border-t border-cream/10 bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px hairline-top opacity-60"
      />

      <Container>
        <div className="grid gap-10 py-14 sm:py-16 lg:grid-cols-12 lg:gap-8">
          {/* ------------------------------------------ who you are dealing with */}
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
                FoodFlow
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-cream/55">
              {t.footer.description}
            </p>

            <dl className="mt-6 space-y-2 text-[13px]">
              <div className="flex gap-2">
                <dt className="sr-only">Titular</dt>
                <dd className="text-cream/70">
                  <span className="font-medium text-cream/85">{LEGAL_HOLDER.name}</span>
                  <span className="text-cream/50"> — {LEGAL_HOLDER.role}</span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Ubicación</dt>
                <dd className="text-cream/55">{LEGAL_HOLDER.location}</dd>
              </div>
              <div>
                <dt className="sr-only">Correo</dt>
                <dd>
                  <a
                    href={`mailto:${LEGAL_HOLDER.email}`}
                    className="inline-flex items-center gap-1.5 text-cream/70 underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    <IconMail className="h-3.5 w-3.5" />
                    {LEGAL_HOLDER.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* ------------------------------------------------------------ nav */}
          <nav className="lg:col-span-3" aria-label="Secciones">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/40">
              El producto
            </p>
            <ul className="mt-4 space-y-2.5">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-cream/60 underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---------------------------------------------------------- legal */}
          <div className="lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/40">
              Legal
            </p>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-cream/60 underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Required to be visible on the site — a symbol, not a text
                link: the icon alone is the affordance, with the label kept
                for screen readers and as a hover tooltip. */}
            <Link
              href="/libro-de-reclamaciones"
              aria-label="Libro de Reclamaciones Virtual"
              title="Libro de Reclamaciones Virtual"
              className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cream/15 bg-cream/[0.04] text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-400/40 hover:bg-accent-400/[0.06]"
            >
              <IconClaimsBook className="h-6 w-6" />
              <span className="sr-only">Libro de Reclamaciones Virtual</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 border-t border-cream/10 py-7 text-center">
          <p className="text-[12.5px] text-cream/55">
            &copy; {new Date().getFullYear()} {t.footer.copyrightSuffix}
          </p>
          <p className="text-[12.5px] text-cream/55">
            {t.footer.signaturePrefix}{" "}
            <span className="font-medium text-cream/62">{LEGAL_HOLDER.name}</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
