"use client";

import { useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { IconX } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";
import type { ActionResult } from "@/lib/actions/auth";
import type { MenuItemInput } from "@/lib/actions/menu";
import type { MenuCategoryDTO } from "@/lib/menuMeta";
import MenuItemForm, { type MenuItemFormValue } from "./MenuItemForm";

export default function MenuItemModal({
  open,
  title,
  categories,
  initial,
  submitLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  categories: MenuCategoryDTO[];
  initial: MenuItemFormValue;
  submitLabel: string;
  onSubmit: (input: MenuItemInput) => Promise<ActionResult<unknown>>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--scrim)] backdrop-blur-sm"
            aria-hidden
          />
          <m.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass relative my-auto w-full max-w-xl rounded-2xl p-6 shadow-panel"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-faint hover:bg-fg/[0.06] hover:text-fg/80"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <MenuItemForm
              categories={categories}
              initial={initial}
              submitLabel={submitLabel}
              compact
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
