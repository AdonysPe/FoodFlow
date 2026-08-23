"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IconCheck, IconX } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";

export default function Toast() {
  const toasts = useDashboardStore((s) => s.toasts);
  const dismissToast = useDashboardStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={`glass pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-[13.5px] shadow-card ${
              toast.tone === "success" ? "text-white/90" : "text-white/90"
            }`}
          >
            {toast.tone === "success" ? (
              <IconCheck className="h-4 w-4 shrink-0 text-mint" />
            ) : (
              <IconX className="h-4 w-4 shrink-0 text-accent-400" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-1 text-white/30 hover:text-white/70"
              aria-label="Dismiss"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
