// Shared class bundles for the Mesas module — lifted verbatim from the
// existing dashboard forms/tables so this module renders as one of them.

export const fieldClass =
  "h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10";

export const compactFieldClass =
  "h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-[13.5px] text-white outline-none focus:border-accent-400/50";

export const labelClass = "mb-1.5 block text-[12px] font-medium text-white/45";

export const ghostButtonClass =
  "rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40";

export const accentButtonClass =
  "rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-colors hover:to-accent-500 disabled:opacity-40";

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
