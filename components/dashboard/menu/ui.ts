// Shared class bundles for the Menú module — same tokens as the rest of the
// client dashboard so this renders as one of the existing screens.

export const fieldClass =
  "h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10";

export const compactFieldClass =
  "h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-[13.5px] text-white outline-none focus:border-accent-400/50";

export const labelClass = "mb-1.5 block text-[12px] font-medium text-white/45";

export const ghostButtonClass =
  "rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40";

export const dangerButtonClass =
  "rounded-lg bg-accent-500 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-40";

// Kept as a thin alias so the Menú/comanda components don't all import from
// lib/format directly; the whole product prices in soles (see lib/format).
export { formatCurrency as formatPrice } from "@/lib/format";
