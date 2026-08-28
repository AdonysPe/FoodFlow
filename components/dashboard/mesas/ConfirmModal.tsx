"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";

// Centered confirmation dialog — used for destructive actions (deleting a
// table). Same glass/keyboard conventions as the rest of the dashboard.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.24, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass relative w-full max-w-sm rounded-2xl p-6 shadow-panel"
          >
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-white">
              {title}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{message}</p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="rounded-lg bg-accent-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-600 disabled:opacity-40"
              >
                {pending ? "Eliminando…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
