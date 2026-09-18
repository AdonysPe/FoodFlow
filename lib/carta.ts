// The public carta: shapes shared by the server page, the JSON endpoint, the
// SSE stream and the client view, plus the opening-hours arithmetic.
//
// No Prisma import and no "use server" — this is the one module both sides of
// the wire are allowed to agree on.
import type { MenuTemplateKey } from "@/lib/menuTemplates";

export const CARTA_DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const CARTA_DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export type DayHours = {
  /** 0 = Sunday, matching Date#getDay so no translation table is needed. */
  day: number;
  closed: boolean;
  /** "HH:MM", 24h. Ignored when `closed`. */
  open: string;
  close: string;
};

export type CartaItemDTO = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  categoryId: string | null;
  available: boolean;
};

export type CartaCategoryDTO = {
  id: string;
  name: string;
};

export type CartaVenueDTO = {
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  address: string | null;
  mapsUrl: string | null;
  whatsapp: string | null;
  hours: DayHours[];
};

/** Everything the public page paints, and everything a live update replaces. */
export type CartaPayload = {
  version: number;
  template: MenuTemplateKey;
  venue: CartaVenueDTO;
  categories: CartaCategoryDTO[];
  items: CartaItemDTO[];
};

// ---------------------------------------------------------------- the slug

/**
 * A venue name turned into the address diners type or scan.
 *
 * Deliberately narrow: lowercase ASCII, digits and single hyphens. A slug ends
 * up in a hostname (`tanta.foodflow.site`), and hostnames have no room for
 * accents, spaces or underscores.
 */
export function slugifyVenue(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

// Subdomains that are the product itself, not a venue.
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "panel",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "blog",
  "docs",
  "help",
  "soporte",
  "status",
  "carta",
  "menu",
  "demo",
  "test",
  "staging",
  "dev",
  "foodflow",
]);

export function slugProblem(slug: string): string | null {
  if (!slug) return "Elige una dirección para tu carta.";
  if (!SLUG_PATTERN.test(slug)) {
    return "Usa solo minúsculas, números y guiones (sin espacios ni tildes).";
  }
  if (RESERVED_SLUGS.has(slug)) return "Esa dirección está reservada. Elige otra.";
  return null;
}

// --------------------------------------------------------------- the hours

export const DEFAULT_HOURS: DayHours[] = Array.from({ length: 7 }, (_, day) => ({
  day,
  closed: day === 1, // Monday off is the Lima default; the owner can change it.
  open: "12:00",
  close: "23:00",
}));

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value: string): number | null {
  const m = HHMM.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Coerces whatever is in the jsonb column into exactly seven valid rows. */
export function normalizeHours(raw: unknown): DayHours[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byDay = new Map<number, DayHours>();

  for (const entry of rows) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const day = Number(e.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;

    const open = typeof e.open === "string" && HHMM.test(e.open) ? e.open : "12:00";
    const close = typeof e.close === "string" && HHMM.test(e.close) ? e.close : "23:00";
    byDay.set(day, { day, closed: Boolean(e.closed), open, close });
  }

  return DEFAULT_HOURS.map((fallback) => byDay.get(fallback.day) ?? fallback);
}

/**
 * Is the venue serving at `now`?
 *
 * A close time earlier than its open time means the shift runs past midnight,
 * so 23:00–02:00 on Friday is still open at 00:30 on Saturday. That case is
 * ordinary in Lima, which is why it is handled rather than clamped.
 */
export function isOpenAt(hours: DayHours[], now: Date): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = hours.find((h) => h.day === now.getDay());
  const yesterday = hours.find((h) => h.day === (now.getDay() + 6) % 7);

  if (today && !today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (open != null && close != null) {
      if (close > open && minutes >= open && minutes < close) return true;
      // Crosses midnight: open until the end of the day counts.
      if (close <= open && minutes >= open) return true;
    }
  }

  // Yesterday's late shift can still be running.
  if (yesterday && !yesterday.closed) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (open != null && close != null && close <= open && minutes < close) return true;
  }

  return false;
}

/** "Hoy 12:00 – 23:00" / "Hoy cerrado" — the one line under the venue name. */
export function todayLabel(hours: DayHours[], now: Date): string {
  const today = hours.find((h) => h.day === now.getDay());
  if (!today || today.closed) return "Hoy cerrado";
  return `Hoy ${today.open} – ${today.close}`;
}

// ------------------------------------------------------------- the contact

/**
 * wa.me link with the venue's number in international form.
 *
 * Peru mobiles are nine digits; anything else is left alone so a venue that
 * stored a full international number still gets a working button.
 */
export function whatsappLink(number: string | null, message: string): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length === 9 ? `51${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

/** Soles, the way the rest of the product writes them. */
export function cartaPrice(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}
