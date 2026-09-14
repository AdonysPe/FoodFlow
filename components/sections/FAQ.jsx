"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

// `as` is forwarded so /preguntas can claim the h1; h2 anywhere else.
export default function FAQ({ as }) {
  const { t } = useLanguage();
  const { openChat } = useChat();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <Container>
        <SectionHeading
          as={as}
          eyebrow={t.faq.eyebrow}
          title={t.faq.title}
          align="left"
        />

        <div className="mt-10 max-w-3xl divide-y divide-cream/10 border-y border-cream/10">
          {t.faq.items.map((item, i) => {
            const isOpen = open === i;
            return (
              // Index key: the copy is translated, and keying on it would
              // remount the row on every language toggle.
              <Reveal key={i} delay={Math.min(i, 3) * 0.05}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-fg"
                  >
                    <span
                      className={`text-[16px] font-semibold sm:text-[17px] ${
                        isOpen ? "text-fg" : "text-cream/85"
                      }`}
                    >
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isOpen
                          ? "border-accent-400/50 bg-accent-400/12 text-accent-ink"
                          : "border-cream/15 text-cream/55"
                      }`}
                    >
                      <motion.svg
                        viewBox="0 0 12 12"
                        className="h-3 w-3"
                        fill="none"
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <path
                          d="M6 1v10M1 6h10"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </motion.svg>
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pr-10 text-[15px] leading-relaxed text-cream/62">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <button
            type="button"
            onClick={() => openChat()}
            className="mt-7 text-[14px] font-medium text-chat-ink underline-offset-4 transition-colors hover:text-chat-400 hover:underline"
          >
            {t.faq.more}
          </button>
        </Reveal>
      </Container>
    </section>
  );
}
