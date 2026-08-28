// Shared labels and metadata for the Mesas module. Interface copy is in
// Spanish, matching the rest of the client dashboard.

export const TABLE_SHAPES = ["round", "square", "rect"] as const;
export type TableShapeValue = (typeof TABLE_SHAPES)[number];

export const TABLE_ZONES = ["salon", "terraza", "barra"] as const;
export type TableZoneValue = (typeof TABLE_ZONES)[number];

export const RESERVATION_STATUSES = [
  "pendiente",
  "confirmada",
  "sentada",
  "cancelada",
  "no_show",
] as const;
export type ReservationStatusValue = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_SOURCES = ["manual", "web"] as const;
export type ReservationSourceValue = (typeof RESERVATION_SOURCES)[number];

export const SHAPE_LABELS: Record<TableShapeValue, string> = {
  round: "Redonda",
  square: "Cuadrada",
  rect: "Rectangular",
};

export const ZONE_LABELS: Record<TableZoneValue, string> = {
  salon: "Salón",
  terraza: "Terraza",
  barra: "Barra",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatusValue, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  sentada: "Sentada",
  cancelada: "Cancelada",
  no_show: "No-show",
};

export const RESERVATION_SOURCE_LABELS: Record<ReservationSourceValue, string> = {
  manual: "Manual",
  web: "Web",
};

// Derived operational state of a table on the floor plan. Not stored — it is
// computed from the table's active order and its confirmed reservations for
// the current time window (see computeTableState in Phase 2).
export const TABLE_STATES = ["libre", "ocupada", "reservada"] as const;
export type TableStateValue = (typeof TABLE_STATES)[number];

export const TABLE_STATE_LABELS: Record<TableStateValue, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  reservada: "Reservada",
};

// A deliberate traffic-light so the three states read apart at a glance:
//   libre    → green   (a saturated system green, kept distinct from the
//                        dashboard's mint, which only ever means "went up")
//   reservada → yellow  (holding, not yet here)
//   ocupada  → red-orange (the brand vermilion — in use right now)
// `solid` is the pure colour (legend dots, status dot); `fill`/`stroke`/`text`
// dress the figure on the plan.
export const TABLE_STATE_TONE: Record<
  TableStateValue,
  { solid: string; fill: string; stroke: string; text: string }
> = {
  libre: {
    solid: "#30D158",
    fill: "rgb(48 209 88 / 0.13)",
    stroke: "rgb(48 209 88 / 0.5)",
    text: "#57DE85",
  },
  reservada: {
    solid: "#FFD426",
    fill: "rgb(255 212 38 / 0.12)",
    stroke: "rgb(255 212 38 / 0.5)",
    text: "#F3CE43",
  },
  ocupada: {
    solid: "#FF5A3C",
    fill: "rgb(255 90 51 / 0.17)",
    stroke: "rgb(255 90 51 / 0.62)",
    text: "#FF8A6B",
  },
};

// "HH:MM" → minutes since midnight. Returns NaN on a malformed string so
// callers can reject it.
export function timeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return NaN;
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Two [start, end) minute intervals overlap when each starts before the other
// ends. Touching edges (one ends exactly when the next begins) do not count.
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// True when `nowMinutes` (minutes since midnight) falls inside the
// reservation's [start, start+duration) window.
export function reservationCoversNow(
  startTime: string,
  durationMin: number,
  nowMinutes: number
): boolean {
  const s = timeToMinutes(startTime);
  if (Number.isNaN(s)) return false;
  return nowMinutes >= s && nowMinutes < s + durationMin;
}

// Every reservation holds its table for at least this long, no matter the
// stated duration — a booked table shouldn't be offered to a walk-in who
// might still be seated when the party arrives. Drives both the plan's
// "reservada" state and the double-booking check.
export const MIN_RESERVATION_BLOCK_MIN = 180;

// The minute-of-day at which a reservation stops holding its table: its start
// plus the greater of the stated duration and the 3-hour minimum.
export function reservationBlockEndMin(startTime: string, durationMin: number): number {
  const s = timeToMinutes(startTime);
  if (Number.isNaN(s)) return NaN;
  return s + Math.max(durationMin, MIN_RESERVATION_BLOCK_MIN);
}

// Does this reservation still have a claim on its table right now? True from
// its start until the block window closes — so a table booked for tonight
// already reads as "reservada" this afternoon.
export function reservationStillHolds(
  startTime: string,
  durationMin: number,
  nowMinutes: number
): boolean {
  const end = reservationBlockEndMin(startTime, durationMin);
  return !Number.isNaN(end) && nowMinutes < end;
}

// A reservation only holds a table while it is still live.
export const ACTIVE_RESERVATION_STATUSES: ReservationStatusValue[] = [
  "pendiente",
  "confirmada",
  "sentada",
];

// A reservation blocks its table (shows "reservada", drives conflict checks)
// only once confirmed or seated — a pending request does not yet own the table.
export const BLOCKING_RESERVATION_STATUSES: ReservationStatusValue[] = [
  "confirmada",
  "sentada",
];

// yyyy-mm-dd in local time, the value <input type="date"> expects.
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Bare-string date math on yyyy-mm-dd, anchored to UTC so it never drifts a
// day. `startOfWeek` returns the Monday of the given date's week.
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  return addDays(isoDate, day === 0 ? -6 : 1 - day);
}
