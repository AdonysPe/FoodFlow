// The pilot runs in Lima — every price in the product is in Peruvian soles.
export function formatCurrency(value: number): string {
  return value.toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("es-PE", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" });
}

// Minutes + seconds, e.g. 460000ms -> "7m 40s". Used for prep-time metrics
// and the kitchen board's live elapsed timer.
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

// Whole soles, no cents — for figures a restaurant owner reads at a glance
// (what commissions took this month, what that is over a year).
export function formatSoles(value: number): string {
  return `S/ ${Math.round(value).toLocaleString("es-PE")}`;
}
