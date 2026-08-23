"use client";

import Container from "@/components/ui/Container";
import { LogoMark } from "@/components/DashboardPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const SOCIAL = [
  {
    label: "X",
    path: "M3 3h4.2l4.1 5.6L16.5 3H21l-6.9 8.1L21.4 21h-4.2l-4.5-6.1L7.4 21H3l7.2-8.4L3 3Z",
  },
  {
    label: "LinkedIn",
    path: "M4.5 8.5h3.2V21H4.5V8.5Zm1.6-5a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM10.5 8.5h3v1.7c.6-1.1 1.9-1.9 3.6-1.9 3 0 4 1.9 4 4.9V21h-3.2v-6.7c0-1.7-.5-2.8-2-2.8-1.3 0-2.1.9-2.4 1.8-.1.3-.1.8-.1 1.2V21h-3.2V8.5Z",
  },
  {
    label: "GitHub",
    path: "M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.8c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.3-1-4.3-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5Z",
  },
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-white/[0.06] bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px hairline-top opacity-60"
      />

      <Container>
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <a href="#" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-white">
                FoodFlow
              </span>
            </a>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/40">
              {t.footer.description}
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/45 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {t.footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[13.5px] text-white/40 transition-colors duration-200 hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-7 sm:flex-row">
          <p className="text-[12.5px] text-white/30">
            &copy; {new Date().getFullYear()} {t.footer.copyrightSuffix}
          </p>
          <div className="flex items-center gap-6">
            {t.footer.bottomLinks.map((l) => (
              <a
                key={l}
                href="#"
                className="text-[12.5px] text-white/30 transition-colors duration-200 hover:text-white/70"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
