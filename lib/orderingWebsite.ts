import { z } from "zod";
import { isOpenAt, normalizeHours, type DayHours } from "@/lib/carta";

// These methods already have a real manual collection flow in comanda.
export const ONLINE_PAYMENT_METHODS = ["efectivo", "yape", "transferencia"] as const;
export class OrderingProblem extends Error {}
export const cleanText = (max: number) => z.string().trim().max(max).transform(value => value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, "").trim());
const money = z.number().finite().min(0).max(100000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, "Usa como máximo dos decimales.");
const hours = z.array(z.object({
  day: z.number().int().min(0).max(6), closed: z.boolean(),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})).length(7).refine(rows => new Set(rows.map(row => row.day)).size === 7);

export const orderingSettingsSchema = z.object({
  active: z.boolean(), paused: z.boolean(), accepting: z.boolean(),
  delivery: z.boolean(), pickup: z.boolean(),
  minimum: money, preparationMinutes: z.number().int().min(1).max(240),
  deliveryMinutes: z.number().int().min(1).max(360), pickupMinutes: z.number().int().min(1).max(240),
  instructions: cleanText(300), pickupInstructions: cleanText(300),
  coverUrl: z.string().trim().max(500).refine(v => !v || /^https:\/\/\S+$/.test(v) || /^\/[^\s/][^\s]*$/.test(v), "La portada debe ser https:// o una ruta de este sitio."),
  hours: hours.nullable(),
  zones: z.array(z.object({
    id: z.string().uuid(), name: cleanText(80).pipe(z.string().min(1)), fee: money,
    minimum: money, available: z.boolean(),
  })).max(50).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Hay zonas duplicadas."),
  payments: z.array(z.object({ method: z.enum(ONLINE_PAYMENT_METHODS), instructions: cleanText(300) })).max(3)
    .refine(rows => new Set(rows.map(row => row.method)).size === rows.length)
    .refine(rows => rows.every(row => row.method === "efectivo" || row.instructions.length > 0), "Indica cómo pagar con Yape / Plin o transferencia."),
}).refine(s => !s.active || s.delivery || s.pickup, "Activa delivery o recojo.")
  .refine(s => !s.active || s.payments.length > 0, "Habilita al menos un método de pago.")
  .refine(s => !s.active || !s.delivery || s.zones.some(z => z.available), "Agrega una zona disponible para delivery.");
export type OrderingSettings = z.infer<typeof orderingSettingsSchema>;
export const DEFAULT_ORDERING: OrderingSettings = {
  active: false, paused: false, accepting: true, delivery: false, pickup: true,
  minimum: 0, preparationMinutes: 20, deliveryMinutes: 45, pickupMinutes: 20,
  instructions: "", pickupInstructions: "", coverUrl: "", hours: null, zones: [],
  payments: [{ method: "efectivo", instructions: "Paga al recibir tu pedido." }],
};
export function readOrderingSettings(raw: unknown): OrderingSettings {
  const parsed = orderingSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_ORDERING };
}
// All restaurants currently operate in Peru. Never use the browser/server timezone.
export function peruWallTime(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (key: string) => Number(parts.find(p => p.type === key)?.value);
  return new Date(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
}
export function orderingAvailability(settings: OrderingSettings, generalHours: unknown, now = new Date()) {
  if (!settings.active) return { open: false, reason: "Esta web de pedidos está inactiva." };
  if (settings.paused || !settings.accepting) return { open: false, reason: "Los pedidos están temporalmente pausados." };
  const schedule = settings.hours ?? (generalHours ? normalizeHours(generalHours) : null);
  if (!schedule || !isOpenAt(schedule as DayHours[], peruWallTime(now))) return { open: false, reason: "El restaurante está cerrado. Vuelve dentro del horario de atención." };
  return { open: true, reason: "Abierto" };
}

// Lima Metropolitana. The map opens here and the diner pans from there, so a
// fresh checkout never starts on the middle of the Atlantic.
export const LIMA_CENTER = { lat: -12.0464, lng: -77.0428 } as const;
export const LIMA_ZOOM = 12;
// Rough bounding box of Peru. Every venue operates here, so a pin outside it
// is a bug or a forged payload, never a customer — and the pin is advisory
// anyway, so dropping it costs the order nothing.
const inPeru = (lat: number, lng: number) => lat >= -18.6 && lat <= -0.01 && lng >= -81.5 && lng <= -68.5;

/// Ties whatever Google called the district to a zone the restaurant actually
/// serves. Accent- and case-insensitive because "Ate Vitarte", "ate vitarte"
/// and "Áte" are the same place to everyone except a string comparison.
const foldName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function matchZoneByDistrict<T extends { name: string; available: boolean }>(zones: T[], district: string): T | null {
  const wanted = foldName(district ?? "");
  if (!wanted) return null;
  const open = zones.filter(zone => zone.available);
  return open.find(zone => foldName(zone.name) === wanted)
    // "San Isidro, Lima" from the geocoder still has to find the "San Isidro"
    // zone, but never let a one-letter zone swallow everything.
    ?? open.find(zone => foldName(zone.name).length >= 4 && (wanted.includes(foldName(zone.name)) || foldName(zone.name).includes(wanted)))
    ?? null;
}

export const onlineOrderSchema = z.object({
  slug: z.string().min(1).max(40), checkoutKey: z.string().uuid(),
  channel: z.enum(["delivery", "pickup"]),
  customerName: cleanText(80).pipe(z.string().min(2, "Ingresa tu nombre.")),
  customerPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Ingresa un teléfono válido."),
  address: cleanText(200), zoneId: z.string().max(40), reference: cleanText(160), notes: cleanText(300),
  // Where the pin ended up, when the diner used the map. Optional on purpose:
  // Maps can fail to load and the hand-typed address still has to go through.
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  placeId: z.string().trim().max(300).optional().nullable(),
  paymentMethod: z.enum(ONLINE_PAYMENT_METHODS),
  // Only detects a changed quote. The stored amount always comes from the catalog.
  expectedTotal: z.number().finite().nonnegative().optional(),
  lines: z.array(z.object({ menuItemId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20), note: cleanText(140).optional() }).strict()).min(1).max(20),
}).refine(v => v.channel !== "delivery" || (v.address.length >= 5 && v.zoneId.length > 0), "Indica tu dirección y una zona atendida.")
  .refine(v => (v.latitude == null) === (v.longitude == null), "La ubicación del mapa está incompleta. Vuelve a confirmarla.")
  .refine(v => v.latitude == null || inPeru(v.latitude, v.longitude!), "Esa ubicación está fuera del Perú.")
  .transform(v => v.channel === "delivery" ? v : { ...v, latitude: null, longitude: null, placeId: null });
export type OnlineOrderInput = z.input<typeof onlineOrderSchema>;

export function deliveryQuote(settings: OrderingSettings, channel: "delivery" | "pickup", zoneId: string, subtotal: number) {
  if (!settings[channel]) throw new OrderingProblem(channel === "delivery" ? "Delivery no disponible." : "Recojo no disponible.");
  const zone = channel === "delivery" ? settings.zones.find(z => z.id === zoneId && z.available) : null;
  if (channel === "delivery" && !zone) throw new OrderingProblem("Zona no atendida. Elige otra zona o recojo en local.");
  const minimum = Math.max(settings.minimum, zone?.minimum ?? 0);
  if (Math.round(subtotal * 100) < Math.round(minimum * 100)) throw new OrderingProblem(`El pedido mínimo es S/ ${minimum.toFixed(2)}.`);
  const fee = zone?.fee ?? 0;
  return { zone, fee, total: (Math.round(subtotal * 100) + Math.round(fee * 100)) / 100 };
}
