// Shared class bundles for the Mesas module — lifted verbatim from the
// existing dashboard forms/tables so this module renders as one of them.

export const fieldClass =
  "h-11 w-full rounded-[14px] border border-[rgba(243,239,230,0.14)] bg-[rgba(12,9,8,0.65)] px-3.5 text-[14px] text-[#f3efe6] placeholder:text-[#6f675e] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[rgba(255,90,51,0.7)] focus:ring-4 focus:ring-[rgba(255,90,51,0.14)]";

export const compactFieldClass =
  "h-9 w-full rounded-[11px] border border-[rgba(243,239,230,0.14)] bg-[rgba(12,9,8,0.65)] px-3 text-[13.5px] text-[#f3efe6] outline-none focus:border-[rgba(255,90,51,0.7)]";

export const labelClass = "mb-1.5 block text-[12px] font-semibold text-[#cfc7bb]";

export const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[rgba(243,239,230,0.16)] bg-transparent px-3.5 py-1.5 text-[12.5px] font-semibold text-[#f3efe6] transition-colors hover:bg-[rgba(243,239,230,0.07)] disabled:opacity-40";

export const accentButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#ff5a33] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0c0908] transition-colors hover:bg-[#ff6c47] disabled:opacity-40";

// "HH:MM" → "9:30 p. m." style label, matching lib/format's locale intent
// but for a bare time string.
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" });
}

export function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
}

export function endTimeLabel(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor((total % 1440) / 60);
  const em = total % 60;
  return formatClock(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
}
