"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LeadForm from "@/components/lead/LeadForm";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { IconX } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

/**
 * The lead form as a dialog. Mounted once in the shell; anything on the site
 * opens it through `openLeadForm()`. The exit-intent popup is this same
 * dialog with the `exit` variant, which only swaps the two lines of copy.
 */
export default function LeadFormModal() {
  const { t } = useLanguage();
  const copy = t.leadForm;
  const { open, request, closeLeadForm } = useLeadCapture();

  const panel = useRef(null);
  const restoreFocus = useRef(null);

  // Escape closes, the page behind stops scrolling, and focus goes back to
  // whatever opened the dialog.
  useEffect(() => {
    if (!open) return;

    restoreFocus.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (event) => {
      if (event.key === "Escape") closeLeadForm();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      restoreFocus.current?.focus?.();
    };
  }, [open, closeLeadForm]);

  const isExit = request?.variant === "exit";
  const title = isExit ? copy.exitTitle : copy.title;
  const subtitle = isExit ? copy.exitSubtitle : copy.subtitle;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label={copy.close}
            onClick={closeLeadForm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-950/75 backdrop-blur-sm"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.38, ease: EASE }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-cream/10 bg-ink-900 p-6 shadow-panel sm:p-7"
          >
            <button
              type="button"
              onClick={closeLeadForm}
              aria-label={copy.close}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-cream/55 transition-colors hover:bg-cream/[0.06] hover:text-white"
            >
              <IconX className="h-4 w-4" />
            </button>

            <span className="inline-flex items-center rounded-full border border-cream/10 bg-cream/[0.03] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-300">
              {copy.eyebrow}
            </span>

            <h2 className="mt-4 pr-8 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white sm:text-[25px]">
              {title}
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-cream/62">{subtitle}</p>

            <LeadForm
              className="mt-6"
              autoFocus
              source={request?.source ?? "web_form"}
              loss={request?.loss ?? null}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
