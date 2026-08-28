"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck, IconX } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";

const TTL: Record<"success" | "error", number> = { success: 1900, error: 3600 };

function ToastItem({
  id,
  message,
  tone,
  onDismiss,
}: {
  id: number;
  message: string;
  tone: "success" | "error";
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), TTL[tone]);
    return () => window.clearTimeout(timer);
  }, [id, tone, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.7 }}
      className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/[0.12] bg-ink-900/80 py-2.5 pl-2.5 pr-3.5 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl backdrop-saturate-150"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          tone === "success" ? "bg-mint/15 text-mint" : "bg-accent-400/15 text-accent-300"
        }`}
      >
        {tone === "success" ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
      </span>
      <span className="leading-tight">{message}</span>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="ml-0.5 shrink-0 rounded-md p-0.5 text-white/25 transition-colors hover:text-white/60"
        aria-label="Descartar"
      >
        <IconX className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

export default function Toast() {
  const toasts = useDashboardStore((s) => s.toasts);
  const dismissToast = useDashboardStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            tone={toast.tone}
            onDismiss={dismissToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
