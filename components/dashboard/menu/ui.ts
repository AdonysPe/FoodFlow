// Shared class bundles for the Menú module — same tokens as the rest of the
// client dashboard so this renders as one of the existing screens.

export const fieldClass =
  "h-11 w-full rounded-[14px] border border-[rgba(243,239,230,0.14)] bg-[rgba(12,9,8,0.65)] px-3.5 text-[14px] text-[#f3efe6] placeholder:text-[#6f675e] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[rgba(255,90,51,0.7)] focus:ring-4 focus:ring-[rgba(255,90,51,0.14)]";

export const compactFieldClass =
  "h-9 w-full rounded-[11px] border border-[rgba(243,239,230,0.14)] bg-[rgba(12,9,8,0.65)] px-3 text-[13.5px] text-[#f3efe6] outline-none focus:border-[rgba(255,90,51,0.7)]";

export const labelClass = "mb-1.5 block text-[12px] font-semibold text-[#cfc7bb]";

export const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[rgba(243,239,230,0.16)] bg-transparent px-3.5 py-1.5 text-[12.5px] font-semibold text-[#f3efe6] transition-colors hover:bg-[rgba(243,239,230,0.07)] disabled:opacity-40";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#d4401d] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#e24a26] disabled:opacity-40";

// Kept as a thin alias so the Menú/comanda components don't all import from
// lib/format directly; the whole product prices in soles (see lib/format).
export { formatCurrency as formatPrice } from "@/lib/format";
