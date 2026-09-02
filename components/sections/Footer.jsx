"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import { LogoMark } from "@/components/ui/Logo";
import { IconMail } from "@/components/ui/Icons";
import { CONTACT_EMAIL } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-cream/10 bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px hairline-top opacity-60"
      />

      <Container>
        <div className="flex flex-col items-center py-16 text-center sm:py-20">
          <a href="#" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-white">
              FoodFlow
            </span>
          </a>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-cream/55">
            {t.footer.description}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-cream/10 bg-cream/[0.04] px-4 py-2 text-[13.5px] font-medium text-cream/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-cream/[0.18] hover:text-white"
          >
            <IconMail className="h-4 w-4" />
            {t.footer.emailCta}
          </a>
        </div>

        <div className="flex flex-col items-center gap-1.5 border-t border-cream/10 py-7 text-center">
          <p className="text-[12.5px] text-cream/55">
            &copy; {new Date().getFullYear()} {t.footer.copyrightSuffix}
          </p>
          <p className="text-[12.5px] text-cream/55">
            {t.footer.signaturePrefix}{" "}
            <span className="font-medium text-cream/62">Adonys Pereda</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href="/precios"
              className="text-[12.5px] text-cream/55 underline-offset-4 transition-colors hover:text-cream/80 hover:underline"
            >
              {t.pricing.eyebrow}
            </Link>
            <Link
              href="/nosotros"
              className="text-[12.5px] text-cream/55 underline-offset-4 transition-colors hover:text-cream/80 hover:underline"
            >
              {t.about.eyebrow}
            </Link>
            <Link
              href="/preguntas"
              className="text-[12.5px] text-cream/55 underline-offset-4 transition-colors hover:text-cream/80 hover:underline"
            >
              {t.faq.eyebrow}
            </Link>
            <Link
              href="/cookies"
              className="text-[12.5px] text-cream/55 underline-offset-4 transition-colors hover:text-cream/80 hover:underline"
            >
              {t.cookies.page.title}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
