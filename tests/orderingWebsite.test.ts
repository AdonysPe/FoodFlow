import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ORDERING, deliveryQuote, onlineOrderSchema, orderingAvailability, orderingSettingsSchema } from "../lib/orderingWebsite";
import { planAllows } from "../lib/plans";
import { orderOriginLabel } from "../lib/orderMeta";
import { buildReceipt, RECEIPT_DEFAULTS } from "../lib/receipt";

const mocks = vi.hoisted(() => ({
  restaurant: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  order: { findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  menuItem: { findMany: vi.fn(), count: vi.fn() },
  restaurantTable: { findUnique: vi.fn() },
  cartaSettings: { upsert: vi.fn() },
  auth: vi.fn(), rateLimit: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { ...mocks, $transaction: mocks.transaction } }));
vi.mock("@/lib/auth/restaurant", () => ({ requireClientRestaurant: mocks.auth }));
vi.mock("@/lib/security/clientHash", () => ({ callerIpHash: async () => "ip-hash" }));
vi.mock("@/lib/security/rateLimit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitOnlineOrder, submitTableOrder } from "../lib/actions/publicOrder";
import { saveOrderingWebsite, setOrderingPaused } from "../lib/actions/orderingWebsite";
import { readOnlineOrder } from "../lib/db/orderingWebsite";

const allHours = Array.from({ length: 7 }, (_, day) => ({ day, closed: false, open: "00:00", close: "00:00" }));
const zone = { id: "48e0f6bb-02fb-4bab-a07d-ecc3f5c032ce", name: "Miraflores", fee: 5.5, minimum: 20, available: true };
const settings = { ...DEFAULT_ORDERING, active: true, delivery: true, hours: allHours, zones: [zone] };
const venue = { id: "venue", ownerId: "owner", slug: "mi-local", name: "Mi local", plan: "negocio", billingStatus: "active", carta: { address: "Av. Lima 123", hours: allHours, ordering: settings } };
const input = { slug: venue.slug, checkoutKey: "f12a8d1b-6399-4a2f-980e-030f327466ab", channel: "delivery" as const, customerName: "Ana", customerPhone: "999888777", address: "Calle 123", zoneId: zone.id, reference: "Puerta roja", notes: "Sin cubiertos", paymentMethod: "efectivo" as const, lines: [{ menuItemId: "dish", quantity: 2, note: "Sin cebolla" }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async fn => fn(mocks));
  mocks.restaurant.findUnique.mockResolvedValue(venue);
  mocks.restaurant.findFirst.mockResolvedValue(venue);
  mocks.menuItem.findMany.mockResolvedValue([{ id: "dish", name: "Plato", price: 12.35, available: true, category: { active: true } }]);
  mocks.menuItem.count.mockResolvedValue(1);
  mocks.order.findUnique.mockResolvedValue(null);
  mocks.order.findFirst.mockResolvedValue(null);
  mocks.order.create.mockResolvedValue({ id: "order" });
  mocks.auth.mockResolvedValue({ user: { id: "owner" }, restaurant: venue, isOwner: true });
  mocks.rateLimit.mockResolvedValue({ ok: true });
});

describe("web propia: reglas", () => {
  it("usa la capacidad de Negocio sin alterar otros planes", () => {
    expect(planAllows("carta", "own_ordering_website")).toBe(false);
    expect(planAllows("servicio", "own_ordering_website")).toBe(false);
    expect(planAllows("negocio", "own_ordering_website")).toBe(true);
  });
  it("calcula horarios de Perú y turnos que cruzan medianoche", () => {
    const hours = allHours.map(row => ({ ...row, closed: row.day !== 5, open: "23:00", close: "02:00" }));
    expect(orderingAvailability({ ...settings, hours }, null, new Date("2026-09-19T06:30:00Z")).open).toBe(true);
    expect(orderingAvailability({ ...settings, hours }, null, new Date("2026-09-19T07:00:00Z")).open).toBe(false);
    expect(orderingAvailability({ ...settings, hours: null }, null).open).toBe(false);
  });
  it.each([{ active: false }, { paused: true }, { accepting: false }])("impide pedidos en estado %o", override => {
    expect(orderingAvailability({ ...settings, ...override }, allHours).open).toBe(false);
  });
  it("aplica mínimo por zona y redondea importes", () => {
    expect(deliveryQuote(settings, "delivery", zone.id, 24.7).total).toBe(30.2);
    expect(deliveryQuote(settings, "pickup", "zona-ajena", 24.7).fee).toBe(0);
    expect(() => deliveryQuote(settings, "delivery", "otra", 24.7)).toThrow("Zona no atendida");
    expect(() => deliveryQuote(settings, "delivery", zone.id, 19)).toThrow("mínimo");
    expect(() => deliveryQuote({ ...settings, delivery: false }, "delivery", zone.id, 25)).toThrow("no disponible");
  });
  it("rechaza zonas duplicadas, importes inválidos y pagos sin instrucciones", () => {
    expect(orderingSettingsSchema.safeParse({ ...settings, zones: [zone, zone] }).success).toBe(false);
    expect(orderingSettingsSchema.safeParse({ ...settings, minimum: -1 }).success).toBe(false);
    expect(orderingSettingsSchema.safeParse({ ...settings, payments: [{ method: "yape", instructions: "" }] }).success).toBe(false);
  });
  it("no acepta opciones de producto inexistentes ni tarjeta; sanitiza notas", () => {
    expect(onlineOrderSchema.safeParse({ ...input, paymentMethod: "tarjeta" }).success).toBe(false);
    expect(onlineOrderSchema.safeParse({ ...input, lines: [{ ...input.lines[0], variant: "falsa" }] }).success).toBe(false);
    expect(onlineOrderSchema.parse({ ...input, notes: "<b>Hola</b>" }).notes).toBe("Hola");
  });
});

describe("creación en la cola de pedidos existente", () => {
  it("recalcula catálogo y tarifa e ignora importes y restaurante inyectados", async () => {
    const result = await submitOnlineOrder({ ...input, total: 1, deliveryFee: 0, restaurantId: "ajeno" } as typeof input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    const data = mocks.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ restaurantId: venue.id, source: "online_store", tableId: null, channel: "delivery", deliveryFee: 5.5, total: 30.2, paymentMethod: "efectivo", customerPhone: input.customerPhone });
    expect(data.paidAt).toBeUndefined();
    expect(data.items[0]).toMatchObject({ price: 12.35, quantity: 2, round: 1 });
    expect(mocks.menuItem.findMany.mock.calls[0][0].where.restaurantId).toBe(venue.id);
    expect(mocks.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable" });
  });
  it("recojo conserva la dirección del local y tarifa cero", async () => {
    await submitOnlineOrder({ ...input, channel: "pickup", address: "", zoneId: "", reference: "" });
    expect(mocks.order.create.mock.calls[0][0].data).toMatchObject({ channel: "pickup", fulfillmentAddress: venue.carta.address, deliveryFee: 0, deliveryZone: null, total: 24.7 });
  });
  it.each([{ plan: "servicio" }, { billingStatus: "cancelled" }, { carta: { ...venue.carta, ordering: { ...settings, paused: true } } }])("rechaza restaurante sin acceso: %o", async override => {
    mocks.restaurant.findUnique.mockResolvedValue({ ...venue, ...override });
    expect((await submitOnlineOrder(input)).ok).toBe(false);
    expect(mocks.order.create).not.toHaveBeenCalled();
  });
  it.each([{ items: [] }, { items: [{ id: "dish", name: "Plato", price: 12, available: false }] }, { items: [{ id: "dish", name: "Plato", price: 12, available: true, category: { active: false } }] }])("rechaza productos ajenos, agotados u ocultos: %o", async ({ items }) => {
    mocks.menuItem.findMany.mockResolvedValue(items);
    expect((await submitOnlineOrder(input)).ok).toBe(false);
    expect(mocks.order.create).not.toHaveBeenCalled();
  });
  it("rechaza zona o pago no habilitado", async () => {
    expect((await submitOnlineOrder({ ...input, zoneId: "ajena" })).ok).toBe(false);
    expect((await submitOnlineOrder({ ...input, paymentMethod: "yape" })).ok).toBe(false);
    expect(mocks.order.create).not.toHaveBeenCalled();
  });
  it("un reintento devuelve el mismo token sin crear otro pedido", async () => {
    const first = await submitOnlineOrder(input);
    const data = mocks.order.create.mock.calls[0][0].data;
    mocks.order.findUnique.mockResolvedValue({ checkoutHash: data.checkoutHash, publicToken: data.publicToken });
    expect(await submitOnlineOrder(input)).toEqual(first);
    expect(mocks.order.create).toHaveBeenCalledTimes(1);
    expect((await submitOnlineOrder({ ...input, notes: "Otro pedido" })).ok).toBe(false);
  });
  it("recupera una colisión de idempotencia concurrente", async () => {
    mocks.transaction.mockRejectedValueOnce({ code: "P2002" });
    expect((await submitOnlineOrder(input)).ok).toBe(true);
    expect(mocks.order.create).toHaveBeenCalledTimes(1);
  });
  it("aplica el rate limiter existente", async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false });
    expect((await submitOnlineOrder(input)).ok).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("mantiene el pedido QR en mesa y conserva sus rondas", async () => {
    mocks.restaurantTable.findUnique.mockResolvedValue({ id: "table", name: "Mesa 1", active: true, restaurantId: venue.id });
    expect((await submitTableOrder({ code: "ABCDEF1234", lines: input.lines })).ok).toBe(true);
    expect(mocks.order.create.mock.calls[0][0].data).toMatchObject({ tableId: "table", channel: "dine_in", total: 24.7, roundNumber: 1 });
    mocks.order.findFirst.mockResolvedValue({ id: "old", items: [], total: 10, roundNumber: 1 });
    mocks.order.update.mockResolvedValue({ total: 34.7 });
    expect(await submitTableOrder({ code: "ABCDEF1234", lines: input.lines })).toMatchObject({ ok: true, round: 2, total: 34.7 });
  });
});

describe("panel, seguimiento y documentos", () => {
  it("deniega activación manual por plan y por rol", async () => {
    mocks.restaurant.findFirst.mockResolvedValue({ ...venue, plan: "carta" });
    expect((await setOrderingPaused(false)).ok).toBe(false);
    expect(mocks.cartaSettings.upsert).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ restaurant: venue, user: { id: "otro" }, isOwner: false });
    expect((await saveOrderingWebsite(settings)).ok).toBe(false);
  });
  it("configura solamente el restaurante del dueño resuelto en sesión", async () => {
    expect((await saveOrderingWebsite(settings)).ok).toBe(true);
    expect(mocks.restaurant.findFirst.mock.calls[0][0].where).toEqual({ id: venue.id, ownerId: "owner" });
    expect(mocks.cartaSettings.upsert.mock.calls[0][0].where).toEqual({ restaurantId: venue.id });
  });
  it("seguimiento exige token aleatorio y contexto del restaurante", async () => {
    expect(await readOnlineOrder("123", venue.slug)).toBeNull();
    expect(mocks.order.findFirst).not.toHaveBeenCalled();
    await readOnlineOrder("a".repeat(64), venue.slug);
    expect(mocks.order.findFirst.mock.calls[0][0].where).toEqual({ publicToken: "a".repeat(64), source: "online_store", restaurant: { slug: venue.slug } });
    expect(mocks.order.findFirst.mock.calls[0][0].select.id).toBeUndefined();
    expect(mocks.order.findFirst.mock.calls[0][0].select.customerPhone).toBeUndefined();
  });
  it("etiqueta el canal sin inventar estados y suma delivery en el comprobante", () => {
    expect(orderOriginLabel("online_store", "pickup")).toBe("WEB · RECOJO");
    expect(orderOriginLabel("online_store", "delivery")).toBe("WEB · DELIVERY");
    const receipt = buildReceipt({ items: [{ name: "Plato", price: 20, quantity: 1 }], deliveryFee: 5, total: 25, channel: "delivery", customerName: "Ana", serverName: null, roundNumber: 1, paidAt: null, paymentMethod: "efectivo", amountReceived: null, changeGiven: null, receiptSeries: null, receiptNumber: null, table: null }, "Local", RECEIPT_DEFAULTS);
    expect(receipt.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)).toBe(25);
  });
});
