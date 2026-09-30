import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscription: { findFirst: vi.fn(), create: vi.fn() },
  subscriptionPayment: { findFirst: vi.fn() },
  subscriptionCheckout: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  restaurant: { update: vi.fn(), findUnique: vi.fn() },
  subscriptionTransition: { create: vi.fn() },
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { ...mocks, $transaction: mocks.transaction, $queryRaw: mocks.queryRaw },
}));
vi.mock("@/lib/security/rateLimit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/auth/guards", () => ({
  requirePlatformAdmin: async () => ({ id: "admin-1", email: "admin@foodflow.site" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { priceFor } from "../lib/subscriptions/pricing";
import { entitlementAllows, resolveEntitlement, type EntitlementInput } from "../lib/subscriptions/entitlement";
import {
  confirmCheckoutInputSchema,
  createCheckoutInputSchema,
  safeReturnPath,
} from "../lib/subscriptions/contract";
import { readCulqiConfig } from "../lib/subscriptions/config";
import { createCulqiAdapter } from "../lib/subscriptions/culqi";
import { ProviderRejectedError, ProviderUnavailableError, type SubscriptionProviderAdapter } from "../lib/subscriptions/provider";
import { hasLiveProviderSubscription, restaurantCanUse } from "../lib/subscriptions/access";
import {
  confirmCheckout,
  createCheckout,
  getSubscriptionView,
  setAdapterFactoryForTests,
  type SubscriptionActor,
} from "../lib/subscriptions/service";
import { PROTECTED_RESTAURANT_FIELDS } from "../lib/auth/restaurantFields";
import { deleteRestaurant, updateRestaurantPlan } from "../lib/actions/restaurants";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-01T12:00:00Z");

// Culqi ids are 25 characters.
const PLAN_ENV = {
  CULQI_PLAN_CARTA: "pln_test_cartaAAAAAAAAAAA",
  CULQI_PLAN_CARTA_TRIAL: "pln_test_cartaTTTTTTTTTTT",
  CULQI_PLAN_SERVICIO: "pln_test_servicioAAAAAAAA",
  CULQI_PLAN_SERVICIO_TRIAL: "pln_test_servicioTTTTTTTT",
  CULQI_PLAN_NEGOCIO: "pln_test_negocioAAAAAAAAA",
  CULQI_PLAN_NEGOCIO_TRIAL: "pln_test_negocioTTTTTTTTT",
};

function enableSubscriptions(extra: Record<string, string> = {}) {
  vi.stubEnv("SUBSCRIPTIONS_ENABLED", "true");
  vi.stubEnv("CULQI_SECRET_KEY", "sk_test_secret");
  vi.stubEnv("CULQI_PUBLIC_KEY", "pk_test_public");
  for (const [k, v] of Object.entries({ ...PLAN_ENV, ...extra })) vi.stubEnv(k, v);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// -------------------------------------------------------------- pricing

describe("precios", () => {
  it("cobra el precio publicado más IGV, calculado en el servidor", () => {
    expect(priceFor("carta")).toMatchObject({ netCents: 6900, igvCents: 1242, grossCents: 8142 });
    expect(priceFor("servicio")).toMatchObject({ netCents: 16900, igvCents: 3042, grossCents: 19942 });
    expect(priceFor("negocio")).toMatchObject({ netCents: 33900, igvCents: 6102, grossCents: 40002 });
  });

  it("neto más IGV siempre suma el bruto, también con descuento", () => {
    const p = priceFor("servicio", 1000);
    expect(p.netCents).toBe(15210);
    expect(p.netCents + p.igvCents).toBe(p.grossCents);
    expect(() => priceFor("carta", 10_000)).toThrow();
  });
});

// ---------------------------------------------------------- entitlement

describe("política de acceso", () => {
  const base: EntitlementInput = { plan: "servicio", billingStatus: "active", billingSource: "provider", accessUntil: null };
  const at = (input: Partial<EntitlementInput>, enforceUnpaid = true) =>
    resolveEntitlement({ ...base, ...input }, NOW, { enforceUnpaid });

  it("una concesión manual da acceso completo sin fecha de fin", () => {
    const e = at({ billingSource: "manual", billingStatus: "active" });
    expect(e).toMatchObject({ mode: "full", effectivePlan: "servicio", reason: "manual" });
    expect(at({ billingSource: "manual", accessUntil: new Date(NOW.getTime() - DAY) }).mode).toBe("locked");
    expect(at({ billingSource: "manual", billingStatus: "cancelled" }).mode).toBe("locked");
  });

  it("un local sin compra solo se bloquea cuando el cobro está activado", () => {
    expect(at({ billingSource: "none", billingStatus: "pending" }, false).mode).toBe("full");
    expect(at({ billingSource: "none", billingStatus: "pending" }, true)).toMatchObject({
      mode: "locked",
      reason: "not_subscribed",
      effectivePlan: null,
    });
  });

  it("prueba y período pagado dan acceso hasta su fin", () => {
    const until = new Date(NOW.getTime() + 3 * DAY);
    expect(at({ billingStatus: "trialing", accessUntil: until })).toMatchObject({ mode: "full", reason: "trialing" });
    expect(at({ billingStatus: "active", accessUntil: until })).toMatchObject({ mode: "full", reason: "active" });
  });

  it("una renovación sin confirmar entra en gracia, no en bloqueo", () => {
    const ended = new Date(NOW.getTime() - 2 * DAY);
    expect(at({ billingStatus: "active", accessUntil: ended })).toMatchObject({ mode: "grace", reason: "renewal_pending" });
    expect(at({ billingStatus: "past_due", accessUntil: ended })).toMatchObject({ mode: "grace", effectivePlan: "servicio" });
    const long = new Date(NOW.getTime() - 8 * DAY);
    expect(at({ billingStatus: "past_due", accessUntil: long })).toMatchObject({ mode: "locked", reason: "grace_expired" });
  });

  it("cancelar respeta el mes pagado y luego bloquea sin borrar nada", () => {
    expect(at({ billingStatus: "cancelled", accessUntil: new Date(NOW.getTime() + DAY) }).mode).toBe("full");
    expect(at({ billingStatus: "cancelled", accessUntil: new Date(NOW.getTime() - DAY) }).mode).toBe("locked");
    expect(at({ billingStatus: "suspended" }).mode).toBe("locked");
    expect(at({ billingStatus: "pending" })).toMatchObject({ mode: "locked", reason: "pending_confirmation" });
  });

  it("el plan sigue decidiendo los módulos cuando hay acceso", () => {
    const e = at({ billingStatus: "active", plan: "carta" });
    expect(entitlementAllows(e, "menu")).toBe(true);
    expect(entitlementAllows(e, "comanda")).toBe(false);
    expect(entitlementAllows(at({ billingStatus: "suspended", plan: "negocio" }), "menu")).toBe(false);
  });

  it("el envoltorio del servidor lee el interruptor del entorno", () => {
    const venue = { plan: "servicio", billingStatus: "pending", billingSource: "none", accessUntil: null };
    expect(restaurantCanUse(venue, "orders")).toBe(true);
    vi.stubEnv("SUBSCRIPTIONS_ENABLED", "true");
    expect(restaurantCanUse(venue, "orders")).toBe(false);
  });

  it("una suscripción pagada viva protege el plan de cambios manuales", () => {
    const paid = { plan: "servicio", billingStatus: "active", billingSource: "provider", accessUntil: new Date(Date.now() + DAY) };
    expect(hasLiveProviderSubscription(paid)).toBe(true);
    expect(hasLiveProviderSubscription({ ...paid, billingSource: "manual" })).toBe(false);
    expect(hasLiveProviderSubscription({ ...paid, billingStatus: "suspended" })).toBe(false);
  });

  it("las columnas de acceso son de escritura protegida", () => {
    expect(PROTECTED_RESTAURANT_FIELDS).toEqual(
      expect.arrayContaining(["plan", "billingStatus", "billingSource", "accessUntil"])
    );
  });
});

// ------------------------------------------------------------- contract

const validCheckout = {
  restaurantId: "ckrestaurant000000000001",
  plan: "servicio",
  idempotencyKey: "8d0f6a52-3a3c-4e33-9d1f-6d2f4d1b0a11",
  acceptTerms: true,
  customer: { firstName: "Ana", lastName: "Quispe", phone: "+51 987 654 321", address: "Av. Lima 123", city: "Lima" },
  billingDocument: { type: "boleta" },
};

describe("contrato", () => {
  it("normaliza el celular y acepta boleta o factura con RUC", () => {
    const parsed = createCheckoutInputSchema.parse(validCheckout);
    expect(parsed.customer.phone).toBe("987654321");
    expect(
      createCheckoutInputSchema.safeParse({
        ...validCheckout,
        billingDocument: { type: "factura", ruc: "20123456789", legalName: "Mi Local SAC" },
      }).success
    ).toBe(true);
    expect(
      createCheckoutInputSchema.safeParse({
        ...validCheckout,
        billingDocument: { type: "factura", ruc: "123", legalName: "Mi Local SAC" },
      }).success
    ).toBe(false);
  });

  it("rechaza que el navegador mande precio, estado o cualquier campo extra", () => {
    expect(createCheckoutInputSchema.safeParse({ ...validCheckout, amount: 1 }).success).toBe(false);
    expect(createCheckoutInputSchema.safeParse({ ...validCheckout, status: "active" }).success).toBe(false);
    expect(createCheckoutInputSchema.safeParse({ ...validCheckout, acceptTerms: false }).success).toBe(false);
    expect(createCheckoutInputSchema.safeParse({ ...validCheckout, plan: "gratis" }).success).toBe(false);
  });

  it("solo acepta tokens de tarjeta de Culqi", () => {
    const ok = { checkoutId: "ckcheckout00000000000001", tokenId: "tkn_test_abcDEF123456" };
    expect(confirmCheckoutInputSchema.safeParse(ok).success).toBe(true);
    expect(confirmCheckoutInputSchema.safeParse({ ...ok, tokenId: "4111111111111111" }).success).toBe(false);
    expect(confirmCheckoutInputSchema.safeParse({ ...ok, activate: true }).success).toBe(false);
  });

  it("solo devuelve rutas internas del panel", () => {
    expect(safeReturnPath("/dashboard/app/configuracion")).toBe("/dashboard/app/configuracion");
    expect(safeReturnPath("/dashboard/app/equipo")).toBe("/dashboard/app/equipo");
    for (const evil of [
      "https://evil.test/dashboard/app",
      "//evil.test",
      "/dashboard/app/../../admin",
      "/dashboard/admin/overview",
      "/dashboard/app\\evil",
      "/dashboard/app?x=1",
      "javascript:alert(1)",
      42,
    ]) {
      expect(safeReturnPath(evil)).toBe("/dashboard/app/configuracion");
    }
  });
});

// --------------------------------------------------------------- config

describe("configuración", () => {
  it("está apagada salvo que se active explícitamente", () => {
    expect(readCulqiConfig()).toEqual({ ok: false, reason: "disabled" });
  });

  it("con todo en modo test queda lista", () => {
    enableSubscriptions();
    const read = readCulqiConfig();
    expect(read.ok && read.config.mode).toBe("test");
    expect(read.ok && read.config.planIds.servicio.trial).toBe(PLAN_ENV.CULQI_PLAN_SERVICIO_TRIAL);
  });

  it("falla cerrada si faltan planes, se mezclan modos o hay llaves live sin permiso", () => {
    enableSubscriptions({ CULQI_PLAN_NEGOCIO: "" });
    expect(readCulqiConfig()).toMatchObject({ ok: false, reason: "misconfigured" });

    enableSubscriptions({ CULQI_PUBLIC_KEY: "pk_live_public" });
    expect(readCulqiConfig()).toMatchObject({ ok: false, reason: "misconfigured" });

    enableSubscriptions({
      CULQI_SECRET_KEY: "sk_live_x",
      CULQI_PUBLIC_KEY: "pk_live_x",
      ...Object.fromEntries(Object.entries(PLAN_ENV).map(([k, v]) => [k, v.replace("pln_test_", "pln_live_")])),
    });
    const live = readCulqiConfig();
    expect(live.ok).toBe(false);
    expect(!live.ok && live.reason === "misconfigured" && live.problems.join()).toContain("SUBSCRIPTIONS_ALLOW_LIVE");
  });
});

// ------------------------------------------------------- Culqi adapter

function fakeFetch(...responses: Array<{ status: number; body: unknown } | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected call");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.body), { status: next.status });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe("adaptador de Culqi", () => {
  it("guarda la tarjeta con la llave secreta y solo devuelve marca y últimos 4", async () => {
    const { impl, calls } = fakeFetch({
      status: 201,
      body: { id: "crd_test_1234567890123456", source: { last_four: "1111", iin: { card_brand: "Visa" } } },
    });
    const culqi = createCulqiAdapter("sk_test_secret", impl);
    const result = await culqi.saveCard({ customerId: "cus_test_1", tokenId: "tkn_test_1", metadata: {} });
    expect(result).toEqual({ kind: "saved", cardId: "crd_test_1234567890123456", brand: "Visa", last4: "1111" });
    expect(calls[0].url).toBe("https://api.culqi.com/v2/cards");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_secret");
    expect(JSON.parse(String(calls[0].init.body))).not.toHaveProperty("authentication_3DS");
  });

  it("reconoce el pedido de 3-D Secure y el rechazo de la tarjeta", async () => {
    const culqi = createCulqiAdapter(
      "sk_test_secret",
      fakeFetch(
        { status: 200, body: { action_code: "REVIEW" } },
        { status: 402, body: { object: "error", type: "card_error", decline_code: "insufficient_funds", user_message: "Fondos insuficientes." } }
      ).impl
    );
    const input = { customerId: "cus_test_1", tokenId: "tkn_test_1", metadata: {} };
    expect(await culqi.saveCard(input)).toEqual({ kind: "requires_3ds" });
    expect(await culqi.saveCard(input)).toEqual({
      kind: "declined",
      code: "insufficient_funds",
      userMessage: "Fondos insuficientes.",
    });
  });

  it("reutiliza el cliente cuando el correo ya existe en Culqi", async () => {
    const { impl, calls } = fakeFetch(
      { status: 400, body: { object: "error", type: "invalid_request_error" } },
      { status: 200, body: { data: [{ id: "cus_test_existing", email: "dueno@local.pe" }] } }
    );
    const culqi = createCulqiAdapter("sk_test_secret", impl);
    const customer = await culqi.ensureCustomer({
      email: "dueno@local.pe", firstName: "Ana", lastName: "Quispe", phone: "987654321",
      address: "Av. Lima 123", city: "Lima", metadata: {},
    });
    expect(customer).toEqual({ customerId: "cus_test_existing" });
    expect(calls[1].url).toBe("https://api.culqi.com/v2/customers?email=dueno%40local.pe");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ country_code: "PE", address_city: "Lima" });
  });

  it("crea la suscripción con tyc y distingue 'sin respuesta' de 'rechazado'", async () => {
    const culqi = createCulqiAdapter(
      "sk_test_secret",
      fakeFetch(
        { status: 201, body: { id: "sxn_test_1234567890123456", status: 1 } },
        new Error("socket hang up"),
        { status: 503, body: {} },
        { status: 400, body: { object: "error", type: "invalid_request_error", code: "plan_inactive" } }
      ).impl
    );
    const input = { cardId: "crd_test_1", planId: "pln_test_1", metadata: {} };
    expect(await culqi.createSubscription(input)).toEqual({ subscriptionId: "sxn_test_1234567890123456", rawStatus: "1" });
    await expect(culqi.createSubscription(input)).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(culqi.createSubscription(input)).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(culqi.createSubscription(input)).rejects.toMatchObject({ providerCode: "plan_inactive" });
  });

  it("lee monto, moneda y ciclos gratis del plan", async () => {
    const culqi = createCulqiAdapter(
      "sk_test_secret",
      fakeFetch({
        status: 200,
        body: { amount: 19942, currency: "PEN", initial_cycles: { count: 1, has_initial_charge: false, amount: 0, interval_unit_time: 2 } },
      }).impl
    );
    expect(await culqi.getPlan("pln_test_1")).toEqual({ amountCents: 19942, currency: "PEN", hasFreeInitialCycles: true });
  });
});

// ---------------------------------------------------------------- service

const restaurant = {
  id: "ckrestaurant000000000001",
  name: "Mi local",
  ownerId: "owner-1",
  plan: "carta",
  billingStatus: "active",
  billingSource: "manual",
  accessUntil: null,
};
const owner: SubscriptionActor = {
  user: { id: "owner-1", email: "dueno@local.pe" },
  restaurant,
  isOwner: true,
};

const checkoutRow = {
  id: "ckcheckout00000000000001",
  restaurantId: restaurant.id,
  userId: "owner-1",
  userEmail: "dueno@local.pe",
  idempotencyKey: validCheckout.idempotencyKey,
  status: "created",
  plan: "servicio",
  provider: "culqi",
  providerPlanId: PLAN_ENV.CULQI_PLAN_SERVICIO_TRIAL,
  withTrial: true,
  trialDays: 7,
  currency: "PEN",
  netAmountCents: 16900,
  igvAmountCents: 3042,
  grossAmountCents: 19942,
  igvRateBps: 1800,
  discountBps: 0,
  customerFirstName: "Ana",
  customerLastName: "Quispe",
  customerPhone: "987654321",
  customerAddress: "Av. Lima 123",
  customerCity: "Lima",
  billingDocType: "boleta",
  billingRuc: null,
  billingLegalName: null,
  returnPath: "/dashboard/app/configuracion",
  termsAcceptedAt: NOW,
  termsVersion: "2026-09-29",
  lockedUntil: null,
  attempts: 0,
  subscriptionId: null,
  failureCode: null,
  expiresAt: new Date(Date.now() + 20 * 60 * 1000),
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

function fakeAdapter(overrides: Partial<SubscriptionProviderAdapter> = {}): SubscriptionProviderAdapter {
  return {
    id: "culqi",
    getPlan: vi.fn(async () => ({ amountCents: 19942, currency: "PEN", hasFreeInitialCycles: true })),
    ensureCustomer: vi.fn(async () => ({ customerId: "cus_test_1" })),
    saveCard: vi.fn(async () => ({ kind: "saved" as const, cardId: "crd_test_1", brand: "Visa", last4: "1111" })),
    createSubscription: vi.fn(async () => ({ subscriptionId: "sxn_test_1", rawStatus: "1" })),
    getEvent: vi.fn(async () => null),
    getSubscription: vi.fn(async () => null),
    cancelSubscription: vi.fn(async () => "canceled" as const),
    findSubscription: vi.fn(async () => null),
    ...overrides,
  };
}

describe("servicio de suscripciones", () => {
  let adapter: SubscriptionProviderAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    enableSubscriptions();
    adapter = fakeAdapter();
    setAdapterFactoryForTests(() => adapter);
    mocks.rateLimit.mockResolvedValue({ ok: true, remaining: 5 });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ ...mocks, $queryRaw: mocks.queryRaw })
    );
    mocks.subscription.findFirst.mockResolvedValue(null);
    mocks.subscriptionCheckout.findUnique.mockResolvedValue(null);
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(null);
    mocks.subscriptionCheckout.updateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionCheckout.create.mockImplementation(async ({ data }: { data: object }) => ({
      ...checkoutRow,
      ...data,
      id: checkoutRow.id,
    }));
    mocks.subscription.create.mockResolvedValue({ id: "sub-1" });
  });

  afterEach(() => setAdapterFactoryForTests(null));

  it("solo el dueño del local activo puede abrir un checkout", async () => {
    const admin = await createCheckout({ ...owner, isOwner: false }, validCheckout);
    expect(admin).toMatchObject({ ok: false, code: "forbidden_not_owner" });
    const other = await createCheckout(owner, { ...validCheckout, restaurantId: "ckotherrestaurant0000001" });
    expect(other).toMatchObject({ ok: false, code: "restaurant_mismatch" });
    const notTheirs = await createCheckout({ ...owner, user: { id: "intruder", email: "x@y.pe" } }, validCheckout);
    expect(notTheirs).toMatchObject({ ok: false, code: "restaurant_mismatch" });
    expect(mocks.subscriptionCheckout.create).not.toHaveBeenCalled();
  });

  it("apagado no abre nada", async () => {
    vi.stubEnv("SUBSCRIPTIONS_ENABLED", "false");
    expect(await createCheckout(owner, validCheckout)).toMatchObject({ ok: false, code: "subscriptions_disabled" });
  });

  it("fija el precio del catálogo, con prueba de 7 días, y entrega la configuración de Culqi", async () => {
    const result = await createCheckout(owner, validCheckout);
    expect(result.ok).toBe(true);
    const data = mocks.subscriptionCheckout.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      plan: "servicio",
      netAmountCents: 16900,
      grossAmountCents: 19942,
      withTrial: true,
      trialDays: 7,
      providerPlanId: PLAN_ENV.CULQI_PLAN_SERVICIO_TRIAL,
      customerPhone: "987654321",
      returnPath: "/dashboard/app/configuracion",
    });
    expect(mocks.queryRaw).toHaveBeenCalled(); // restaurant row locked
    if (result.ok) {
      expect(result.data.next).toMatchObject({
        type: "culqi_checkout",
        publicKey: "pk_test_public",
        settings: { currency: "PEN", amount: 19942 },
      });
      expect(result.data.next.threeDSReturnUrl).toMatch(/\/dashboard\/app\/configuracion\?checkout=ckcheckout00000000000001$/);
      expect(JSON.stringify(result.data)).not.toContain("sk_test_secret");
    }
  });

  it("sin prueba disponible usa el plan regular", async () => {
    mocks.subscription.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      "trialUsedAt" in where ? { id: "old" } : null
    );
    adapter = fakeAdapter({ getPlan: vi.fn(async () => ({ amountCents: 19942, currency: "PEN", hasFreeInitialCycles: false })) });
    await createCheckout(owner, validCheckout);
    expect(mocks.subscriptionCheckout.create.mock.calls[0][0].data).toMatchObject({
      withTrial: false,
      trialDays: 0,
      providerPlanId: PLAN_ENV.CULQI_PLAN_SERVICIO,
    });
  });

  it("no pide tarjeta si el plan en Culqi no cobra lo mismo que el catálogo", async () => {
    adapter = fakeAdapter({ getPlan: vi.fn(async () => ({ amountCents: 17900, currency: "PEN", hasFreeInitialCycles: true })) });
    expect(await createCheckout(owner, validCheckout)).toMatchObject({ ok: false, code: "provider_misconfigured" });
    expect(mocks.subscriptionCheckout.create).not.toHaveBeenCalled();
  });

  it("la misma clave devuelve el mismo intento; otra clave con otro plan es conflicto", async () => {
    mocks.subscriptionCheckout.findUnique.mockResolvedValue(checkoutRow);
    const again = await createCheckout(owner, validCheckout);
    expect(again.ok && again.data.checkoutId).toBe(checkoutRow.id);
    expect(mocks.subscriptionCheckout.create).not.toHaveBeenCalled();

    adapter = fakeAdapter({ getPlan: vi.fn(async () => ({ amountCents: 40002, currency: "PEN", hasFreeInitialCycles: true })) });
    expect(await createCheckout(owner, { ...validCheckout, plan: "negocio" })).toMatchObject({
      ok: false,
      code: "idempotency_conflict",
    });
  });

  it("no abre un segundo cobro con una suscripción viva o un pago en curso", async () => {
    mocks.subscription.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      "OR" in where ? { status: "active" } : null
    );
    expect(await createCheckout(owner, validCheckout)).toMatchObject({ ok: false, code: "already_subscribed" });

    mocks.subscription.findFirst.mockResolvedValue(null);
    mocks.subscriptionCheckout.findFirst.mockResolvedValue({ id: "busy" });
    expect(await createCheckout(owner, validCheckout)).toMatchObject({ ok: false, code: "checkout_in_progress" });
  });

  const confirmInput = { checkoutId: checkoutRow.id, tokenId: "tkn_test_abcDEF123456" };

  it("confirmar crea la suscripción en Culqi pero NO activa el plan", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    const result = await confirmCheckout(owner, confirmInput);
    expect(result).toEqual({ ok: true, data: { status: "processing", checkoutId: checkoutRow.id } });
    expect(adapter.createSubscription).toHaveBeenCalledWith({
      cardId: "crd_test_1",
      planId: PLAN_ENV.CULQI_PLAN_SERVICIO_TRIAL,
      metadata: { restaurant_id: restaurant.id, checkout_id: checkoutRow.id },
    });
    expect(mocks.subscription.create.mock.calls[0][0].data).toMatchObject({
      status: "pending",
      providerSubscriptionId: "sxn_test_1",
      grossAmountCents: 19942,
      cardLast4: "1111",
    });
    expect(mocks.subscription.create.mock.calls[0][0].data.trialUsedAt).toBeInstanceOf(Date);
    expect(mocks.subscriptionCheckout.update.mock.calls[0][0].data).toMatchObject({ status: "processing" });
    expect(mocks.restaurant.update).not.toHaveBeenCalled();
  });

  it("3-D Secure: pide la autenticación y reenvía sus parámetros en la segunda llamada", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    adapter = fakeAdapter({ saveCard: vi.fn(async () => ({ kind: "requires_3ds" as const })) });
    const first = await confirmCheckout(owner, confirmInput);
    expect(first).toMatchObject({
      ok: true,
      data: { status: "requires_action", threeDS: { email: "dueno@local.pe", totalAmount: 19942 } },
    });
    expect(adapter.createSubscription).not.toHaveBeenCalled();

    adapter = fakeAdapter();
    const threeDS = { eci: "05", xid: "x", cavv: "c", protocolVersion: "2.1.0", directoryServerTransactionId: "d" };
    await confirmCheckout(owner, { ...confirmInput, authentication3DS: threeDS });
    expect(adapter.saveCard).toHaveBeenCalledWith(expect.objectContaining({ authentication3DS: threeDS }));
  });

  it("una tarjeta rechazada deja reintentar con otra", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    adapter = fakeAdapter({
      saveCard: vi.fn(async () => ({ kind: "declined" as const, code: "stolen_card", userMessage: "Tarjeta rechazada." })),
    });
    expect(await confirmCheckout(owner, confirmInput)).toEqual({
      ok: false,
      code: "card_declined",
      error: "Tarjeta rechazada.",
    });
    expect(mocks.subscriptionCheckout.updateMany.mock.calls.at(-1)?.[0].data).toMatchObject({
      status: "created",
      lockedUntil: null,
    });
    expect(mocks.subscription.create).not.toHaveBeenCalled();
  });

  it("un doble clic no llega dos veces a Culqi", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    mocks.subscriptionCheckout.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ ok: false, code: "checkout_in_progress" });
    expect(adapter.saveCard).not.toHaveBeenCalled();
  });

  it("si Culqi no responde al crear la suscripción, se aparca para conciliar en vez de reintentar", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    adapter = fakeAdapter({
      createSubscription: vi.fn(async () => {
        throw new ProviderUnavailableError("timeout", "subscription.create");
      }),
    });
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ ok: true, data: { status: "processing" } });
    expect(mocks.subscription.create.mock.calls[0][0].data.providerSubscriptionId).toBeNull();
    expect(mocks.subscriptionCheckout.update.mock.calls[0][0].data).toMatchObject({
      status: "processing",
      failureCode: "unknown_outcome",
    });
  });

  it("un rechazo del cobro inicial se trata como tarjeta rechazada", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(checkoutRow);
    adapter = fakeAdapter({
      createSubscription: vi.fn(async () => {
        throw new ProviderRejectedError("402", "subscription.create", 402, "card_error");
      }),
    });
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ ok: false, code: "card_declined" });
    expect(mocks.subscription.create).not.toHaveBeenCalled();
  });

  it("rechaza confirmar checkouts ajenos, vencidos o cerrados, y tokens del otro modo", async () => {
    mocks.subscriptionCheckout.findFirst.mockResolvedValue(null);
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ code: "checkout_not_found" });

    mocks.subscriptionCheckout.findFirst.mockResolvedValue({ ...checkoutRow, expiresAt: new Date(Date.now() - 1000) });
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ code: "checkout_expired" });

    mocks.subscriptionCheckout.findFirst.mockResolvedValue({ ...checkoutRow, status: "canceled" });
    expect(await confirmCheckout(owner, confirmInput)).toMatchObject({ code: "checkout_closed" });

    expect(await confirmCheckout(owner, { ...confirmInput, tokenId: "tkn_live_abcDEF123456" })).toMatchObject({
      code: "invalid_input",
    });
    expect(adapter.saveCard).not.toHaveBeenCalled();
  });

  it("el estado muestra acceso, precios con IGV y si queda prueba", async () => {
    const view = await getSubscriptionView({ ...owner, isOwner: false });
    expect(view.ok).toBe(true);
    if (view.ok) {
      expect(view.data).toMatchObject({
        canManage: false,
        checkoutEnabled: true,
        source: "manual",
        access: { mode: "full", reason: "manual" },
        trial: { eligible: true, days: 7 },
        subscription: null,
      });
      expect(view.data.offers.map((o) => o.price.grossCents)).toEqual([8142, 19942, 40002]);
    }
  });
});

// ------------------------------------------------------ manual grants

describe("concesiones manuales del admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mocks));
  });

  it("siguen funcionando y quedan registradas como manuales", async () => {
    mocks.restaurant.findUnique.mockResolvedValue({ ...restaurant, billingSource: "none", billingStatus: "pending" });
    expect(await updateRestaurantPlan(restaurant.id, "negocio")).toEqual({ ok: true, data: undefined });
    expect(mocks.restaurant.update.mock.calls[0][0].data).toEqual({
      plan: "negocio",
      billingSource: "manual",
      billingStatus: "active",
      accessUntil: null,
    });
    expect(mocks.subscriptionTransition.create.mock.calls[0][0].data).toMatchObject({
      fromSource: "none",
      toSource: "manual",
      fromPlan: "carta",
      toPlan: "negocio",
      reason: "admin.plan",
      actorEmail: "admin@foodflow.site",
    });
  });

  it("no pisan ni borran un local con suscripción pagada viva", async () => {
    mocks.restaurant.findUnique.mockResolvedValue({
      ...restaurant,
      billingSource: "provider",
      billingStatus: "active",
      accessUntil: new Date(Date.now() + DAY),
    });
    expect(await updateRestaurantPlan(restaurant.id, "negocio")).toMatchObject({ ok: false });
    expect(await deleteRestaurant(restaurant.id)).toMatchObject({ ok: false });
    expect(mocks.restaurant.update).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
