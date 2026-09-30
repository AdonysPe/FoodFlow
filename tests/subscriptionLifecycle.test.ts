import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakePrisma } from "./helpers/fakePrisma";

vi.mock("@/lib/db/prisma", async () => {
  const { createFakePrisma } = await import("./helpers/fakePrisma");
  return { prisma: createFakePrisma() };
});
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimit: vi.fn(async () => ({ ok: true, remaining: 9 })),
}));
const adminGate = vi.hoisted(() => ({ allow: true }));
vi.mock("@/lib/auth/guards", () => ({
  requirePlatformAdmin: async () => {
    if (!adminGate.allow) throw new Error("Not authorized");
    return { id: "admin-1", email: "admin@foodflow.site" };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/security/rateLimit";
import { Prisma } from "@prisma/client";
import { receiveCulqiWebhook, authenticateDelivery } from "../lib/subscriptions/webhooks";
import { runSubscriptionMaintenance } from "../lib/subscriptions/maintenance";
import { cancelSubscription, changeSubscriptionPlan, previewPlanChange } from "../lib/subscriptions/operations";
import { getCheckoutStatus, getSubscriptionView, setAdapterFactoryForTests, type SubscriptionActor } from "../lib/subscriptions/service";
import { restaurantEntitlement } from "../lib/subscriptions/access";
import { processStoredEvent } from "../lib/subscriptions/webhooks";
import { safeError } from "../lib/subscriptions/runtime";
import { readCulqiKeys } from "../lib/subscriptions/config";
import {
  cancelReactivation,
  reactivateSubscription,
  startPaymentMethodUpdate,
  updatePaymentMethod,
} from "../lib/subscriptions/operations";
import {
  abandonPendingSubscription,
  getSubscriptionOps,
  reconcileSubscriptionNow,
  reprocessSubscriptionEvent,
  repairSubscriptionProjection,
  resolveSubscriptionReview,
} from "../lib/actions/subscriptionAdmin";
import { addMonths } from "../lib/subscriptions/lifecycle";
import { chargeFacts, classifyEvent, collectIds, providerDate } from "../lib/subscriptions/events";
import { createCulqiAdapter } from "../lib/subscriptions/culqi";
import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type ProviderCharge,
  type ProviderEvent,
  type ProviderSubscriptionState,
  type SubscriptionProviderAdapter,
} from "../lib/subscriptions/provider";

const db = prisma as unknown as FakePrisma;
const DAY = 24 * 60 * 60 * 1000;
const SECRET = "s".repeat(40);

const PLAN_ENV = {
  CULQI_PLAN_CARTA: "pln_test_cartaAAAAAAAAAAA",
  CULQI_PLAN_CARTA_TRIAL: "pln_test_cartaTTTTTTTTTTT",
  CULQI_PLAN_SERVICIO: "pln_test_servicioAAAAAAAA",
  CULQI_PLAN_SERVICIO_TRIAL: "pln_test_servicioTTTTTTTT",
  CULQI_PLAN_NEGOCIO: "pln_test_negocioAAAAAAAAA",
  CULQI_PLAN_NEGOCIO_TRIAL: "pln_test_negocioTTTTTTTTT",
};

// ------------------------------------------------------------ fake Culqi

type FakeCulqi = {
  events: Map<string, ProviderEvent>;
  charges: Map<string, ProviderCharge>;
  subs: Map<string, ProviderSubscriptionState>;
  adapter: SubscriptionProviderAdapter;
  down: boolean;
};

let culqi: FakeCulqi;
let subSeq = 0;

function makeCulqi(): FakeCulqi {
  const state: FakeCulqi = { events: new Map(), charges: new Map(), subs: new Map(), down: false } as FakeCulqi;
  const guard = () => {
    if (state.down) throw new ProviderUnavailableError("down", "test");
  };
  state.adapter = {
    id: "culqi",
    getPlan: vi.fn(async () => ({ amountCents: 0, currency: "PEN", hasFreeInitialCycles: null })),
    ensureCustomer: vi.fn(async () => ({ customerId: "cus_test_1" })),
    saveCard: vi.fn(async () => ({ kind: "saved" as const, cardId: "crd_test_card1", brand: "Visa", last4: "1111" })),
    createSubscription: vi.fn(async ({ cardId, planId }) => {
      guard();
      const id = `sxn_test_new${++subSeq}`;
      state.subs.set(id, { id, status: "active", cardId, planId, trialEndsAt: null, nextBillingAt: null, createdAt: new Date(), chargeIds: [] });
      return { subscriptionId: id, rawStatus: "1" };
    }),
    getEvent: vi.fn(async (id: string) => {
      guard();
      return state.events.get(id) ?? null;
    }),
    getSubscription: vi.fn(async (id: string) => {
      guard();
      return state.subs.get(id) ?? null;
    }),
    cancelSubscription: vi.fn(async (id: string) => {
      guard();
      const sub = state.subs.get(id);
      if (sub) sub.status = "canceled";
      return "canceled" as const;
    }),
    findSubscription: vi.fn(async () => null),
    getCharge: vi.fn(async (id: string) => {
      guard();
      return state.charges.get(id) ?? null;
    }),
    updateSubscriptionCard: vi.fn(async (id: string, cardId: string) => {
      guard();
      const sub = state.subs.get(id);
      if (sub) sub.cardId = cardId;
    }),
  };
  return state;
}

function event(id: string, type: string, data: Record<string, unknown>) {
  culqi.events.set(id, { id, type, createdAt: new Date(), data });
}

function deliver(eventId: string, auth = `Basic ${Buffer.from(`culqi:${SECRET}`).toString("base64")}`, body?: string) {
  return receiveCulqiWebhook(
    new Request("https://foodflow.site/api/subscriptions/webhooks/culqi", {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      // Whatever the body claims is ignored: only the id is read.
      body: body ?? JSON.stringify({ object: "event", id: eventId, type: "charge.creation.succeeded", data: { amount: 1 } }),
    })
  );
}

// ------------------------------------------------------------ fixtures

const OWNER = { id: "owner-1", email: "dueno@local.pe" };

async function seedRestaurant(extra: Record<string, unknown> = {}) {
  return db.restaurant.create({
    data: {
      id: "ckrestaurant000000000001",
      name: "Mi local",
      ownerId: OWNER.id,
      plan: "carta",
      billingSource: "manual",
      billingStatus: "active",
      accessUntil: null,
      ...extra,
    },
  });
}

async function seedPendingSubscription({ trialDays = 7, plan = "servicio", providerSubscriptionId = "sxn_test_trial1" } = {}) {
  const restaurant = await seedRestaurant();
  const sub = await db.subscription.create({
    data: {
      restaurantId: restaurant.id,
      restaurantName: "Mi local",
      ownerId: OWNER.id,
      ownerEmail: OWNER.email,
      provider: "culqi",
      providerCustomerId: "cus_test_1",
      providerCardId: "crd_test_card1",
      providerSubscriptionId,
      providerPlanId: trialDays ? PLAN_ENV.CULQI_PLAN_SERVICIO_TRIAL : PLAN_ENV.CULQI_PLAN_SERVICIO,
      plan,
      status: "pending",
      netAmountCents: 16900,
      igvAmountCents: 3042,
      grossAmountCents: 19942,
      igvRateBps: 1800,
      trialDays,
      trialUsedAt: trialDays ? new Date() : null,
      cardBrand: "Visa",
      cardLast4: "1111",
    },
  });
  const checkout = await db.subscriptionCheckout.create({
    data: {
      restaurantId: restaurant.id,
      userId: OWNER.id,
      userEmail: OWNER.email,
      idempotencyKey: "8d0f6a52-3a3c-4e33-9d1f-6d2f4d1b0a11",
      status: "processing",
      plan,
      provider: "culqi",
      providerPlanId: sub.providerPlanId,
      withTrial: trialDays > 0,
      trialDays,
      currency: "PEN",
      netAmountCents: 16900,
      igvAmountCents: 3042,
      grossAmountCents: 19942,
      igvRateBps: 1800,
      customerFirstName: "Ana",
      customerLastName: "Quispe",
      customerPhone: "987654321",
      customerAddress: "Av. Lima 123",
      customerCity: "Lima",
      billingDocType: "boleta",
      returnPath: "/dashboard/app/configuracion",
      termsAcceptedAt: new Date(),
      termsVersion: "2026-09-29",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      subscriptionId: sub.id,
    },
  });
  culqi.subs.set(providerSubscriptionId, {
    id: providerSubscriptionId,
    status: "active",
    cardId: "crd_test_card1",
    planId: sub.providerPlanId as string,
    trialEndsAt: trialDays ? new Date(Date.now() + trialDays * DAY) : null,
    nextBillingAt: null,
    createdAt: new Date(),
    chargeIds: [],
  });
  return { restaurant, sub, checkout };
}

async function restaurantRow() {
  return (await db.restaurant.findUnique({ where: { id: "ckrestaurant000000000001" } }))!;
}
async function actor(isOwner = true): Promise<SubscriptionActor> {
  const r = await restaurantRow();
  return {
    user: isOwner ? OWNER : { id: "manager-1", email: "gerente@local.pe" },
    isOwner,
    restaurant: r as unknown as NonNullable<SubscriptionActor["restaurant"]>,
  };
}

/** Trial started and confirmed, like after the first webhook. */
async function activeTrial() {
  const seeded = await seedPendingSubscription();
  event("evt_test_0000start", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
  await deliver("evt_test_0000start");
  return seeded;
}

beforeEach(() => {
  for (const t of Object.values(db)) {
    if (t && typeof t === "object" && "rows" in t) (t as { rows: unknown[] }).rows.length = 0;
  }
  culqi = makeCulqi();
  setAdapterFactoryForTests(() => culqi.adapter);
  vi.stubEnv("SUBSCRIPTIONS_ENABLED", "true");
  vi.stubEnv("CULQI_SECRET_KEY", "sk_test_secret");
  vi.stubEnv("CULQI_PUBLIC_KEY", "pk_test_public");
  vi.stubEnv("CULQI_WEBHOOK_SECRET", SECRET);
  for (const [k, v] of Object.entries(PLAN_ENV)) vi.stubEnv(k, v);
});

afterEach(() => {
  vi.unstubAllEnvs();
  setAdapterFactoryForTests(null);
});

// ---------------------------------------------------------- webhook gate

describe("webhook: autenticidad", () => {
  it("sin secreto configurado no procesa nada", async () => {
    vi.stubEnv("CULQI_WEBHOOK_SECRET", "");
    expect((await deliver("evt_test_0000000001")).status).toBe(503);
    expect(db.subscriptionWebhookEvent.rows).toHaveLength(0);
  });

  it("rechaza avisos sin el secreto correcto, sin guardar ni consultar", async () => {
    expect((await deliver("evt_test_0000000001", "Basic " + Buffer.from("culqi:otro").toString("base64"))).status).toBe(401);
    expect((await deliver("evt_test_0000000001", "")).status).toBe(401);
    expect(db.subscriptionWebhookEvent.rows).toHaveLength(0);
    expect(culqi.adapter.getEvent).not.toHaveBeenCalled();
  });

  it("acepta el secreto como Basic, Bearer o token en la URL", () => {
    const url = new URL("https://x/y");
    expect(authenticateDelivery(new Headers({ authorization: `Bearer ${SECRET}` }), url, SECRET)).toBe(true);
    expect(authenticateDelivery(new Headers(), new URL(`https://x/y?token=${SECRET}`), SECRET)).toBe(true);
    expect(authenticateDelivery(new Headers(), url, SECRET)).toBe(false);
  });

  it("rechaza cuerpos que no son un evento de Culqi", async () => {
    expect((await deliver("x", undefined, "no es json")).status).toBe(400);
    expect((await deliver("x", undefined, JSON.stringify({ id: "chr_test_1" }))).status).toBe(400);
  });

  it("un evento que Culqi no tiene (falsificado) no toca nada y se descarta tras la ventana", async () => {
    await seedPendingSubscription();
    // Culqi's event API can lag its own webhook: the first answer is "retry".
    expect((await deliver("evt_test_0000forged")).status).toBe(503);
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "failed", error: "event_not_visible_yet" });
    expect((await restaurantRow()).billingSource).toBe("manual");

    // Past the window it is dropped for good.
    const later = new Date(Date.now() + 20 * 60 * 1000);
    expect(await processStoredEvent(db.subscriptionWebhookEvent.rows[0].id, later)).toBe("ignored");
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "ignored" });
    expect((await restaurantRow()).billingSource).toBe("manual");
  });

  it("no guarda el cuerpo del aviso: solo el tipo", async () => {
    await activeTrial();
    expect(db.subscriptionWebhookEvent.rows[0].payload).toEqual(
      expect.objectContaining({ type: "charge.creation.succeeded" })
    );
    expect(JSON.stringify(db.subscriptionWebhookEvent.rows[0].payload)).not.toContain("amount");
  });
});

// ------------------------------------------------------------ lifecycle

describe("ciclo de suscripción", () => {
  it("la prueba empieza cuando Culqi lo confirma, y abre el plan hasta su fin", async () => {
    const { checkout } = await activeTrial();
    const r = await restaurantRow();
    expect(r).toMatchObject({ plan: "servicio", billingSource: "provider", billingStatus: "trialing" });
    const until = r.accessUntil as Date;
    expect(until.getTime()).toBeGreaterThan(Date.now() + 6 * DAY);
    expect(until.getTime()).toBeLessThanOrEqual(Date.now() + 7 * DAY + 1000);
    expect(restaurantEntitlement(r as never)).toMatchObject({ mode: "full", reason: "trialing" });
    expect((await db.subscriptionCheckout.findUnique({ where: { id: checkout.id } }))!.status).toBe("completed");
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "provider.trial_started", toStatus: "trialing" });
  });

  it("la prueba nunca dura más de lo aprobado aunque Culqi diga otra cosa", async () => {
    await seedPendingSubscription();
    culqi.subs.get("sxn_test_trial1")!.trialEndsAt = new Date(Date.now() + 40 * DAY);
    event("evt_test_0000start", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
    await deliver("evt_test_0000start");
    expect(((await restaurantRow()).accessUntil as Date).getTime()).toBeLessThanOrEqual(Date.now() + 7 * DAY + 1000);
    // ...and a plan configured with a longer trial at Culqi is flagged for a person.
    expect(db.subscription.rows[0]).toMatchObject({ needsReview: true, reviewReason: "trial_longer_at_provider" });
  });

  it("un aviso repetido no hace nada la segunda vez", async () => {
    await activeTrial();
    const transitions = db.subscriptionTransition.rows.length;
    const again = await deliver("evt_test_0000start");
    expect(again).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(db.subscriptionTransition.rows).toHaveLength(transitions);
    expect(culqi.adapter.getEvent).toHaveBeenCalledTimes(1);
  });

  it("el cobro al terminar la prueba pasa a activo hasta la próxima fecha de cobro", async () => {
    await activeTrial();
    const next = new Date(Date.now() + 30 * DAY);
    culqi.subs.get("sxn_test_trial1")!.nextBillingAt = next;
    event("evt_test_0000paid1", "charge.creation.succeeded", {
      id: "chr_test_pay1", amount: 19942, currency_code: "PEN", creation_date: Math.floor(Date.now() / 1000), metadata: {}, source: { id: "crd_test_card1" },
    });
    expect((await deliver("evt_test_0000paid1")).status).toBe(200);
    expect(await restaurantRow()).toMatchObject({ billingStatus: "active", accessUntil: next });
    expect(db.subscriptionPayment.rows).toHaveLength(1);
    expect(db.subscriptionPayment.rows[0]).toMatchObject({ status: "succeeded", amountCents: 19942 });

    // The same charge under another event id is still one payment.
    event("evt_test_0000paid1b", "charge.creation.succeeded", { id: "chr_test_pay1", amount: 19942, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000paid1b");
    expect(db.subscriptionPayment.rows).toHaveLength(1);
  });

  it("un cobro rechazado deja al local en gracia y luego se recupera", async () => {
    await activeTrial();
    event("evt_test_0000fail1", "charge.failed", { id: "chr_test_fail1", amount: 19942, outcome: { code: "insufficient_funds" }, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000fail1");
    const pastDue = await restaurantRow();
    expect(pastDue.billingStatus).toBe("past_due");
    // Access continues: the trial end has not passed, and after it comes grace.
    expect(restaurantEntitlement(pastDue as never).mode).not.toBe("locked");
    expect(db.subscriptionPayment.rows[0]).toMatchObject({ status: "failed", failureCode: "insufficient_funds" });

    event("evt_test_0000paid2", "charge.creation.succeeded", { id: "chr_test_pay2", amount: 19942, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000paid2");
    expect((await restaurantRow()).billingStatus).toBe("active");
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "provider.recovered" });
  });

  it("eventos fuera de orden no acortan el acceso ni reviven un rechazo viejo", async () => {
    await activeTrial();
    const later = Date.now() + 5 * DAY;
    event("evt_test_0000new", "charge.creation.succeeded", { id: "chr_test_new", amount: 19942, creation_date: later, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000new");
    const accessAfterNew = ((await restaurantRow()).accessUntil as Date).getTime();

    event("evt_test_0000old", "charge.creation.succeeded", { id: "chr_test_old", amount: 19942, creation_date: Date.now(), source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000old");
    expect(((await restaurantRow()).accessUntil as Date).getTime()).toBe(accessAfterNew);

    event("evt_test_0000oldfail", "charge.failed", { id: "chr_test_oldfail", creation_date: Date.now() - DAY, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000oldfail");
    expect((await restaurantRow()).billingStatus).toBe("active");
  });

  it("si el primer cobro (sin prueba) falla, no se concede nada y se puede reintentar", async () => {
    const { checkout } = await seedPendingSubscription({ trialDays: 0, providerSubscriptionId: "sxn_test_nt1" });
    event("evt_test_0000f1", "charge.failed", { id: "chr_test_f1", amount: 19942, source: { id: "crd_test_card1" }, metadata: {} });
    await deliver("evt_test_0000f1");
    expect(await restaurantRow()).toMatchObject({ billingSource: "manual", plan: "carta" });
    expect(await db.subscriptionCheckout.findUnique({ where: { id: checkout.id } })).toMatchObject({
      status: "failed",
      failureCode: "card_declined",
    });
    expect(db.subscription.rows[0]).toMatchObject({ status: "cancelled" });
    expect(db.subscription.rows[0].endedAt).toBeInstanceOf(Date);
    expect(culqi.adapter.cancelSubscription).toHaveBeenCalledWith("sxn_test_nt1");
  });

  it("una devolución se marca para revisión sin quitar acceso", async () => {
    await activeTrial();
    event("evt_test_0000paid", "charge.creation.succeeded", { id: "chr_test_p", amount: 19942, source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000paid");
    const before = await restaurantRow();
    event("evt_test_0000ref", "refund.creation.succeeded", { id: "ref_test_1", charge_id: "chr_test_p", amount: 19942 });
    await deliver("evt_test_0000ref");
    expect(db.subscriptionPayment.rows[0].status).toBe("refunded");
    expect(db.subscription.rows[0]).toMatchObject({ needsReview: true, reviewReason: "refund" });
    expect(await restaurantRow()).toMatchObject({ billingStatus: before.billingStatus, accessUntil: before.accessUntil });
  });

  it("si Culqi no responde, pide reintento y el mantenimiento lo termina", async () => {
    await seedPendingSubscription();
    event("evt_test_0000start", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
    culqi.down = true;
    expect((await deliver("evt_test_0000start")).status).toBe(503);
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "failed" });

    culqi.down = false;
    await runSubscriptionMaintenance();
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "processed" });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
  });

  it("sin webhook, la consulta del checkout pregunta a Culqi y activa la prueba", async () => {
    const { checkout } = await seedPendingSubscription();
    const result = await getCheckoutStatus(await actor(), checkout.id);
    expect(result).toMatchObject({ ok: true, data: { status: "completed", purpose: "new" } });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
  });

  it("una cancelación hecha en Culqi respeta el período pagado", async () => {
    await activeTrial();
    culqi.subs.get("sxn_test_trial1")!.status = "canceled";
    event("evt_test_0000del", "subscription.deleted", { id: "sxn_test_trial1" });
    await deliver("evt_test_0000del");
    const r = await restaurantRow();
    expect(r.billingStatus).toBe("cancelled");
    expect(restaurantEntitlement(r as never)).toMatchObject({ mode: "full", reason: "canceled_until_period_end" });
  });
});

// ------------------------------------------------------ owner operations

describe("cancelar y cambiar de plan", () => {
  it("solo el dueño del local activo cancela; el gerente no", async () => {
    await activeTrial();
    expect(await cancelSubscription(await actor(false), { restaurantId: "ckrestaurant000000000001", confirm: true })).toMatchObject({
      ok: false,
      code: "forbidden_not_owner",
    });
    expect(await cancelSubscription(await actor(), { restaurantId: "ckotherrestaurant0000001", confirm: true })).toMatchObject({
      ok: false,
      code: "restaurant_mismatch",
    });
    expect(culqi.adapter.cancelSubscription).not.toHaveBeenCalled();
  });

  it("cancelar detiene la renovación en Culqi y mantiene el acceso hasta el fin del período", async () => {
    await activeTrial();
    const result = await cancelSubscription(await actor(), { restaurantId: "ckrestaurant000000000001", confirm: true, reason: "price" });
    expect(result).toMatchObject({ ok: true, data: { status: "cancelled", cancelAtPeriodEnd: true } });
    expect(culqi.adapter.cancelSubscription).toHaveBeenCalledWith("sxn_test_trial1");
    const r = await restaurantRow();
    expect(restaurantEntitlement(r as never).mode).toBe("full");
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "owner.cancel:price" });

    expect(await cancelSubscription(await actor(), { restaurantId: "ckrestaurant000000000001", confirm: true })).toMatchObject({
      ok: false,
      code: "already_canceled",
    });
  });

  it("un plan manual no se cancela por aquí", async () => {
    await seedRestaurant();
    expect(await cancelSubscription(await actor(), { restaurantId: "ckrestaurant000000000001", confirm: true })).toMatchObject({
      ok: false,
      code: "manual_subscription",
    });
  });

  it("si Culqi no confirma la cancelación, no se cambia nada", async () => {
    await activeTrial();
    culqi.down = true;
    expect(await cancelSubscription(await actor(), { restaurantId: "ckrestaurant000000000001", confirm: true })).toMatchObject({
      ok: false,
      code: "provider_unavailable",
    });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
  });

  it("subir de plan cobra ya el plan nuevo y lo abre solo cuando Culqi confirma el cobro", async () => {
    await activeTrial();
    const preview = await previewPlanChange(await actor(), { restaurantId: "ckrestaurant000000000001", targetPlan: "negocio" });
    expect(preview).toMatchObject({
      ok: true,
      data: { direction: "upgrade", endsTrial: true, chargeNow: { grossCents: 40002 }, blockers: [] },
    });

    const change = await changeSubscriptionPlan(await actor(), {
      restaurantId: "ckrestaurant000000000001",
      targetPlan: "negocio",
      idempotencyKey: "0b7f7a1e-6c0e-4a55-9a0e-3b0a1c2d3e4f",
      confirm: true,
    });
    expect(change).toMatchObject({ ok: true, data: { kind: "checkout", status: "processing" } });
    expect(culqi.adapter.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "crd_test_card1", planId: PLAN_ENV.CULQI_PLAN_NEGOCIO })
    );
    expect((await restaurantRow()).plan).toBe("servicio"); // not before payment

    const newSub = db.subscription.rows.find((s) => s.plan === "negocio")!;
    event("evt_test_0000up", "charge.creation.succeeded", { id: "chr_test_up", amount: 40002, metadata: {}, subscription_id: newSub.providerSubscriptionId });
    await deliver("evt_test_0000up");
    expect(await restaurantRow()).toMatchObject({ plan: "negocio", billingStatus: "active" });
    const old = db.subscription.rows.find((s) => s.plan === "servicio")!;
    expect(old.endedAt).toBeInstanceOf(Date);
    expect(culqi.adapter.cancelSubscription).toHaveBeenCalledWith("sxn_test_trial1");
    const checkoutId = change.ok && change.data.kind === "checkout" ? change.data.checkoutId : "";
    expect(await getCheckoutStatus(await actor(), checkoutId)).toMatchObject({
      ok: true,
      data: { status: "completed", purpose: "upgrade" },
    });

    // Same key again returns the same change instead of charging twice.
    const replay = await changeSubscriptionPlan(await actor(), {
      restaurantId: "ckrestaurant000000000001",
      targetPlan: "negocio",
      idempotencyKey: "0b7f7a1e-6c0e-4a55-9a0e-3b0a1c2d3e4f",
      confirm: true,
    });
    expect(replay).toMatchObject({ ok: true, data: { kind: "checkout", checkoutId } });
    expect(culqi.adapter.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("bajar de plan se bloquea con más usuarios de los permitidos", async () => {
    await activeTrial();
    await db.staffMembership.create({ data: { restaurantId: "ckrestaurant000000000001", userId: "mozo-1" } });
    const preview = await previewPlanChange(await actor(), { restaurantId: "ckrestaurant000000000001", targetPlan: "carta" });
    expect(preview).toMatchObject({ ok: true, data: { blockers: [{ code: "staff_over_limit", current: 2, max: 1 }] } });
    expect(
      await changeSubscriptionPlan(await actor(), {
        restaurantId: "ckrestaurant000000000001",
        targetPlan: "carta",
        idempotencyKey: "1b7f7a1e-6c0e-4a55-9a0e-3b0a1c2d3e4f",
        confirm: true,
      })
    ).toMatchObject({ ok: false, code: "downgrade_blocked" });
  });

  it("bajar de plan se programa al fin del período y el mantenimiento lo ejecuta", async () => {
    await activeTrial();
    const change = await changeSubscriptionPlan(await actor(), {
      restaurantId: "ckrestaurant000000000001",
      targetPlan: "carta",
      idempotencyKey: "2b7f7a1e-6c0e-4a55-9a0e-3b0a1c2d3e4f",
      confirm: true,
    });
    expect(change).toMatchObject({ ok: true, data: { kind: "scheduled" } });
    expect(culqi.adapter.cancelSubscription).toHaveBeenCalledWith("sxn_test_trial1");
    expect((await restaurantRow()).plan).toBe("servicio"); // keeps the paid period

    const view = await getSubscriptionView(await actor());
    expect(view.ok && view.data.subscription?.pendingChange?.plan).toBe("carta");
    expect(view.ok && view.data.actions).toMatchObject({ canCancel: true, canChangePlan: false, canReactivate: false });

    // Culqi reports the stop we asked for: the status must not drop.
    event("evt_test_0000stop", "subscription.deleted", { id: "sxn_test_trial1" });
    await deliver("evt_test_0000stop");
    expect((await restaurantRow()).billingStatus).toBe("trialing");

    // The date arrives.
    db.subscription.rows[0].pendingPlanEffectiveAt = new Date(Date.now() - 1000);
    await runSubscriptionMaintenance();
    expect(culqi.adapter.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ planId: PLAN_ENV.CULQI_PLAN_CARTA })
    );
  });

  it("el estado devuelve lo que la interfaz necesita", async () => {
    await activeTrial();
    const view = await getSubscriptionView(await actor(false));
    expect(view).toMatchObject({
      ok: true,
      data: {
        canManage: false,
        source: "provider",
        status: "trialing",
        access: { mode: "full", reason: "trialing" },
        subscription: { status: "trialing", pendingChange: null, lastPayment: null, card: { last4: "1111" } },
        actions: { canCancel: false, canChangePlan: false },
      },
    });
  });
});

// ---------------------------------------------------- pure helpers

describe("lectura defensiva de Culqi", () => {
  it("clasifica eventos por familia, fallo antes que éxito", () => {
    expect(classifyEvent("charge.creation.succeeded")).toBe("charge_succeeded");
    expect(classifyEvent("charge.creation.failed")).toBe("charge_failed");
    expect(classifyEvent("refund.creation.succeeded")).toBe("refund");
    expect(classifyEvent("subscription.charge.failed")).toBe("charge_failed");
    expect(classifyEvent("subscription.deleted")).toBe("subscription_changed");
    expect(classifyEvent("token.creation.succeeded")).toBe("ignored");
  });

  it("entiende fechas en segundos, milisegundos o ISO", () => {
    expect(providerDate(1790000000)?.getTime()).toBe(1790000000000);
    expect(providerDate(1790000000000)?.getTime()).toBe(1790000000000);
    expect(providerDate("2026-10-01T00:00:00Z")?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(providerDate("x")).toBeNull();
  });

  it("encuentra ids donde estén y lee el cargo", () => {
    const data = { id: "ref_test_1", charge_id: "chr_test_9", nested: { card: { id: "crd_test_2" } } };
    expect(collectIds(data)).toMatchObject({ charges: ["chr_test_9"], cards: ["crd_test_2"] });
    expect(chargeFacts(data)?.chargeId).toBe("chr_test_9");
  });

  it("suma meses de calendario sin desbordar", () => {
    expect(addMonths(new Date("2026-01-31T12:00:00Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("el adaptador lee eventos por id y cancela de forma idempotente", async () => {
    const responses = [
      { status: 404, body: {} },
      { status: 200, body: { object: "event", id: "evt_test_00001", type: "charge.failed", data: { id: "chr_test_1" } } },
      { status: 404, body: {} },
      { status: 404, body: {} },
    ];
    const fetchImpl = vi.fn(async () => {
      const next = responses.shift()!;
      return new Response(JSON.stringify(next.body), { status: next.status });
    }) as unknown as typeof fetch;
    const adapter = createCulqiAdapter("sk_test_x", fetchImpl);
    expect(await adapter.getEvent("evt_test_0000missing")).toBeNull();
    expect(await adapter.getEvent("evt_test_00001")).toMatchObject({ type: "charge.failed", data: { id: "chr_test_1" } });
    expect(await adapter.cancelSubscription("sxn_test_gone")).toBe("already_canceled");
  });
});


// =====================================================================
// Fase 5 — revisión de integración
// =====================================================================

const RID = "ckrestaurant000000000001";

describe("registros y alertas sin datos sensibles", () => {
  it("un error de Prisma nunca se escribe con sus argumentos", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Invalid `prisma.subscriptionCheckout.create()` invocation: data: { customerFirstName: 'Ana', customerPhone: '987654321' }",
      { code: "P2002", clientVersion: "test" }
    );
    expect(safeError(error)).toBe("PrismaError:P2002");
    expect(safeError(new Error("sk_test_secret leaked"))).toBe("Error");
    expect(safeError(new ProviderUnavailableError("Culqi card.create: HTTP 503", "card.create"))).toContain("HTTP 503");
  });

  it("un fallo interno del webhook no filtra su mensaje al registro ni a la fila del evento", async () => {
    await seedPendingSubscription();
    event("evt_test_0000leak1", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
    culqi.adapter.getSubscription = vi.fn(async () => {
      throw new Error("boom with Ana Quispe 987654321 and sk_test_secret");
    });
    const logs: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((line) => void logs.push(String(line)));
    const reply = await deliver("evt_test_0000leak1");
    spy.mockRestore();

    expect(reply.status).toBe(500);
    const row = db.subscriptionWebhookEvent.rows[0];
    expect(row).toMatchObject({ status: "failed", error: "Error" });
    const written = logs.join("\n") + JSON.stringify(row);
    expect(written).not.toMatch(/Ana|987654321|sk_test_secret/);
    expect(logs.some((l) => l.includes("alert.webhook_failed"))).toBe(true);
  });

  it("las alertas salen al webhook de errores con ids y códigos, sin secretos", async () => {
    vi.stubEnv("ERROR_LOG_WEBHOOK_URL", "https://logs.example/hook");
    const posted: Array<{ url: string; body: string }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      posted.push({ url: String(url), body: String(init?.body) });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { alertOps } = await import("../lib/subscriptions/runtime");
      await alertOps("review_needed", { subscriptionId: "cksub1", reason: "refund" });
    } finally {
      globalThis.fetch = original;
      spy.mockRestore();
    }
    expect(posted).toHaveLength(1);
    expect(JSON.parse(posted[0].body)).toMatchObject({
      source: "foodflow.subscriptions",
      event: "alert.review_needed",
      data: { subscriptionId: "cksub1", reason: "refund" },
    });
  });
});

describe("webhook: eventos que llegan antes de tiempo", () => {
  it("un evento que aún no menciona nada nuestro se conserva y se procesa cuando aparece la suscripción", async () => {
    event("evt_test_0000early", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
    const first = await deliver("evt_test_0000early");
    expect(first).toMatchObject({ status: 200, body: { result: "pending" } });
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "failed", error: "no_matching_subscription" });

    await seedPendingSubscription();
    await runSubscriptionMaintenance();
    expect(db.subscriptionWebhookEvent.rows[0]).toMatchObject({ status: "processed" });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
  });

  it("si nada nuestro aparece en 24 horas, el evento se descarta", async () => {
    event("evt_test_0000never", "subscription.creation.succeeded", { id: "sxn_test_stranger" });
    await deliver("evt_test_0000never");
    const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await processStoredEvent(db.subscriptionWebhookEvent.rows[0].id, later)).toBe("ignored");
  });

  it("los intentos con secreto equivocado tienen tope por origen", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({ ok: false, retryAfterMs: 1000 });
    const reply = await deliver("evt_test_0000abcd", "Bearer wrong");
    expect(reply.status).toBe(429);
  });
});

describe("conciliación por los cargos de Culqi (sin webhook)", () => {
  function listCharge(id: string, outcome: "succeeded" | "failed" | "unknown", extra: Partial<ProviderCharge["facts"]> = {}) {
    culqi.charges.set(id, {
      outcome,
      facts: { chargeId: id, amountCents: 19942, currency: "PEN", occurredAt: new Date(), failureCode: null, ...extra },
    });
    culqi.subs.get("sxn_test_trial1")!.chargeIds.push(id);
  }

  it("un cobro pagado cuyo aviso se perdió extiende el acceso igual", async () => {
    await activeTrial();
    culqi.subs.get("sxn_test_trial1")!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    listCharge("chr_test_ledger1", "succeeded");
    const { checkout } = { checkout: db.subscriptionCheckout.rows[0] };
    void checkout;
    const adapter = culqi.adapter;
    const { reconcileSubscription } = await import("../lib/subscriptions/reconcile");
    const note = await reconcileSubscription(adapter, db.subscription.rows[0].id);
    expect(note).toContain("charges:1");
    expect(await restaurantRow()).toMatchObject({ billingStatus: "active" });
    expect(db.subscriptionPayment.rows).toHaveLength(1);
    // Running it again changes nothing.
    await reconcileSubscription(adapter, db.subscription.rows[0].id);
    expect(db.subscriptionPayment.rows).toHaveLength(1);
  });

  it("una suscripción sin prueba se activa por su cobro aunque no llegue ningún aviso", async () => {
    const { sub } = await seedPendingSubscription({ trialDays: 0, providerSubscriptionId: "sxn_test_nt9" });
    culqi.subs.get("sxn_test_nt9")!.chargeIds = ["chr_test_first9"];
    culqi.subs.get("sxn_test_nt9")!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    culqi.charges.set("chr_test_first9", {
      outcome: "succeeded",
      facts: { chargeId: "chr_test_first9", amountCents: 19942, currency: "PEN", occurredAt: new Date(), failureCode: null },
    });
    await runSubscriptionMaintenance();
    expect(await restaurantRow()).toMatchObject({ plan: "servicio", billingStatus: "active", billingSource: "provider" });
    expect(db.subscriptionCheckout.rows[0].status).toBe("completed");
    void sub;
  });

  it("un cargo rechazado leído de Culqi deja al local en gracia; uno ambiguo no cambia nada", async () => {
    await activeTrial();
    listCharge("chr_test_bad1", "failed", { failureCode: "insufficient_funds" });
    listCharge("chr_test_odd1", "unknown");
    const { reconcileSubscription } = await import("../lib/subscriptions/reconcile");
    await reconcileSubscription(culqi.adapter, db.subscription.rows[0].id);
    expect((await restaurantRow()).billingStatus).toBe("past_due");
    expect(db.subscriptionPayment.rows).toHaveLength(1);
    expect(db.subscriptionPayment.rows[0]).toMatchObject({ status: "failed", failureCode: "insufficient_funds" });
  });

  it("un evento de cargo sin id de cargo cae a leer la suscripción y sus cargos", async () => {
    await activeTrial();
    culqi.subs.get("sxn_test_trial1")!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    listCharge("chr_test_ledger2", "succeeded");
    event("evt_test_0000nocharge", "charge.creation.succeeded", { subscription_id: "sxn_test_trial1" });
    const reply = await deliver("evt_test_0000nocharge");
    expect(reply.status).toBe(200);
    expect(db.subscriptionPayment.rows).toHaveLength(1);
    expect((await restaurantRow()).billingStatus).toBe("active");
  });

  it("dos suscripciones con la misma tarjeta: no se adivina, cada una lee sus propios cargos", async () => {
    await activeTrial(); // old, on card crd_test_card1
    const old = db.subscription.rows[0];
    const fresh = await db.subscription.create({
      data: {
        restaurantId: RID, restaurantName: "Mi local", ownerId: OWNER.id, ownerEmail: OWNER.email,
        provider: "culqi", providerCustomerId: "cus_test_1", providerCardId: "crd_test_card1",
        providerSubscriptionId: "sxn_test_fresh1", providerPlanId: PLAN_ENV.CULQI_PLAN_NEGOCIO,
        plan: "negocio", status: "pending", netAmountCents: 33900, igvAmountCents: 6102, grossAmountCents: 40002,
        igvRateBps: 1800, replacesSubscriptionId: old.id,
      },
    });
    culqi.subs.set("sxn_test_fresh1", {
      id: "sxn_test_fresh1", status: "active", cardId: "crd_test_card1", planId: PLAN_ENV.CULQI_PLAN_NEGOCIO,
      trialEndsAt: null, nextBillingAt: null, createdAt: new Date(), chargeIds: [],
    });
    // The renewal charge belongs to the OLD subscription's list.
    culqi.subs.get("sxn_test_trial1")!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    listCharge("chr_test_oldrenew", "succeeded");
    event("evt_test_0000ambig", "charge.creation.succeeded", { source: { id: "crd_test_card1" } });
    await deliver("evt_test_0000ambig");

    expect(db.subscriptionPayment.rows.map((p) => p.subscriptionId)).toEqual([old.id]);
    expect((await db.subscription.findUnique({ where: { id: fresh.id } }))!.activatedAt).toBeNull();
    expect(db.subscriptionWebhookEvent.rows.at(-1)!.payload).toMatchObject({ note: "ambiguous_card:reconciled" });
  });
});

describe("separación entre sandbox y producción", () => {
  it("las llaves reales se rechazan en Preview y Development aunque se habiliten", () => {
    vi.stubEnv("CULQI_SECRET_KEY", "sk_live_secret");
    vi.stubEnv("CULQI_PUBLIC_KEY", "pk_live_public");
    vi.stubEnv("SUBSCRIPTIONS_ALLOW_LIVE", "true");
    vi.stubEnv("NEXT_PUBLIC_LEGAL_TAX_ID", "20131312955");
    vi.stubEnv("VERCEL_ENV", "preview");
    const preview = readCulqiKeys();
    expect(preview.ok).toBe(false);
    expect(!preview.ok && preview.reason === "misconfigured" && preview.problems.join()).toContain("solo se aceptan en producción");

    vi.stubEnv("VERCEL_ENV", "production");
    expect(readCulqiKeys().ok).toBe(true);
    vi.stubEnv("SUBSCRIPTIONS_ALLOW_LIVE", "false");
    expect(readCulqiKeys().ok).toBe(false);
  });

  it("un evento del otro modo se ignora sin guardarse", async () => {
    const reply = await deliver("evt_live_0000abcd");
    expect(reply).toMatchObject({ status: 200, body: { ignored: true } });
    expect(db.subscriptionWebhookEvent.rows).toHaveLength(0);
  });
});

describe("reactivar", () => {
  async function cancelled() {
    await activeTrial();
    await cancelSubscription(await actor(), { restaurantId: RID, confirm: true });
    return db.subscription.rows[0];
  }
  const key = () => crypto.randomUUID();

  it("con días pagados por delante se programa: no cobra ahora y conserva los días", async () => {
    const before = await cancelled();
    const result = await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true });
    expect(result).toMatchObject({ ok: true, data: { kind: "scheduled" } });
    expect(culqi.adapter.createSubscription).not.toHaveBeenCalled();
    const sub = db.subscription.rows[0];
    expect(sub).toMatchObject({ pendingPlan: "servicio", status: "cancelled" });
    expect((sub.pendingPlanEffectiveAt as Date).getTime()).toBe((before.trialEndsAt as Date).getTime());
    expect(restaurantEntitlement((await restaurantRow()) as never).mode).toBe("full");

    const view = await getSubscriptionView(await actor());
    expect(view.ok && view.data.actions).toMatchObject({ canReactivate: false, canUndoReactivation: true });

    // The date arrives: the card is charged then, and the new subscription takes over.
    db.subscription.rows[0].pendingPlanEffectiveAt = new Date(Date.now() - 1000);
    await runSubscriptionMaintenance();
    expect(culqi.adapter.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "crd_test_card1", planId: PLAN_ENV.CULQI_PLAN_SERVICIO })
    );
    const fresh = db.subscription.rows.find((s) => s.replacesSubscriptionId)!;
    culqi.subs.get(fresh.providerSubscriptionId as string)!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    event("evt_test_0000react", "charge.creation.succeeded", { id: "chr_test_react", amount: 19942, subscription_id: fresh.providerSubscriptionId });
    await deliver("evt_test_0000react");
    expect(await restaurantRow()).toMatchObject({ plan: "servicio", billingStatus: "active" });
  });

  it("sin días por delante se cobra ahora con la tarjeta guardada", async () => {
    await cancelled();
    db.subscription.rows[0].trialEndsAt = new Date(Date.now() - DAY);
    db.subscription.rows[0].endedAt = new Date();
    const view = await getSubscriptionView(await actor());
    expect(view.ok && view.data.subscription?.reactivation).toMatchObject({ plan: "servicio", chargeAt: null });
    const result = await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true });
    expect(result).toMatchObject({ ok: true, data: { kind: "checkout", status: "processing" } });
    expect(culqi.adapter.createSubscription).toHaveBeenCalledTimes(1);
    expect(db.subscriptionCheckout.rows.at(-1)).toMatchObject({ purpose: "new", withTrial: false });
  });

  it("solo el dueño, solo si está cancelada, y no dos veces", async () => {
    await activeTrial();
    expect(await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true })).toMatchObject({
      ok: false,
      code: "not_reactivable",
    });
    await cancelSubscription(await actor(), { restaurantId: RID, confirm: true });
    expect(await reactivateSubscription(await actor(false), { restaurantId: RID, idempotencyKey: key(), confirm: true })).toMatchObject({
      ok: false,
      code: "forbidden_not_owner",
    });
    expect(await reactivateSubscription(await actor(), { restaurantId: "ckotherrestaurant0000001", idempotencyKey: key(), confirm: true })).toMatchObject({
      ok: false,
      code: "restaurant_mismatch",
    });
    const k = key();
    await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: k, confirm: true });
    expect(await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true })).toMatchObject({
      ok: false,
      code: "change_pending",
    });
  });

  it("se puede deshacer una reactivación programada", async () => {
    await cancelled();
    await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true });
    expect(await cancelReactivation(await actor(), { restaurantId: RID, confirm: true })).toMatchObject({ ok: true });
    expect(db.subscription.rows[0].pendingPlan).toBeNull();
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "owner.reactivation_canceled" });
  });

  it("si al llegar la fecha la tarjeta es rechazada, no se reintenta cada noche", async () => {
    await cancelled();
    await reactivateSubscription(await actor(), { restaurantId: RID, idempotencyKey: key(), confirm: true });
    db.subscription.rows[0].pendingPlanEffectiveAt = new Date(Date.now() - 1000);
    culqi.adapter.createSubscription = vi.fn(async () => {
      throw new ProviderRejectedError("402", "subscription.create", 402, "card_error");
    });
    await runSubscriptionMaintenance();
    expect(db.subscription.rows[0]).toMatchObject({ pendingPlan: null, status: "cancelled" });
    await runSubscriptionMaintenance();
    expect(culqi.adapter.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("una bajada programada que no se puede cobrar vuelve a 'pago atrasado' y no se reintenta", async () => {
    await activeTrial();
    await changeSubscriptionPlan(await actor(), { restaurantId: RID, targetPlan: "carta", idempotencyKey: key(), confirm: true });
    db.subscription.rows[0].pendingPlanEffectiveAt = new Date(Date.now() - 1000);
    culqi.adapter.createSubscription = vi.fn(async () => {
      throw new ProviderRejectedError("402", "subscription.create", 402, "card_error");
    });
    await runSubscriptionMaintenance();
    expect(db.subscription.rows[0]).toMatchObject({ pendingPlan: null, status: "past_due" });
    await runSubscriptionMaintenance();
    expect(culqi.adapter.createSubscription).toHaveBeenCalledTimes(1);
  });
});

describe("cambiar la tarjeta", () => {
  const tok = "tkn_test_abcDEF123456";

  it("entrega la configuración de Culqi Checkout con la tarjeta actual", async () => {
    await activeTrial();
    const session = await startPaymentMethodUpdate(await actor(), { restaurantId: RID });
    expect(session).toMatchObject({
      ok: true,
      data: { card: { last4: "1111" }, next: { type: "culqi_checkout", publicKey: "pk_test_public", settings: { currency: "PEN", amount: 19942 } } },
    });
    expect(JSON.stringify(session)).not.toContain("sk_test_secret");
  });

  it("guarda la tarjeta nueva, la pone en la suscripción de Culqi y avisa que reintentará el cobro", async () => {
    await activeTrial();
    db.subscription.rows[0].status = "past_due";
    culqi.adapter.saveCard = vi.fn(async () => ({ kind: "saved" as const, cardId: "crd_test_card2", brand: "Mastercard", last4: "4444" }));
    const result = await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: tok });
    expect(result).toMatchObject({ ok: true, data: { status: "updated", card: { last4: "4444" }, willRetryCharge: true } });
    expect(culqi.adapter.updateSubscriptionCard).toHaveBeenCalledWith("sxn_test_trial1", "crd_test_card2");
    expect(db.subscription.rows[0]).toMatchObject({ providerCardId: "crd_test_card2", cardBrand: "Mastercard", cardLast4: "4444" });
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "owner.card_updated" });
    expect(JSON.stringify(db.subscriptionTransition.rows)).not.toContain(tok);
  });

  it("3-D Secure: pide la autenticación y reenvía su resultado", async () => {
    await activeTrial();
    culqi.adapter.saveCard = vi.fn(async () => ({ kind: "requires_3ds" as const }));
    expect(await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: tok })).toMatchObject({
      ok: true,
      data: { status: "requires_action", threeDS: { totalAmount: 19942 } },
    });
    expect(culqi.adapter.updateSubscriptionCard).not.toHaveBeenCalled();
  });

  it("una tarjeta rechazada no cambia nada", async () => {
    await activeTrial();
    culqi.adapter.saveCard = vi.fn(async () => ({ kind: "declined" as const, code: "stolen_card", userMessage: "Tarjeta rechazada." }));
    expect(await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: tok })).toMatchObject({ ok: false, code: "card_declined" });
    expect(db.subscription.rows[0].providerCardId).toBe("crd_test_card1");
  });

  it("solo el dueño del local activo, con token del modo correcto", async () => {
    await activeTrial();
    expect(await updatePaymentMethod(await actor(false), { restaurantId: RID, tokenId: tok })).toMatchObject({ code: "forbidden_not_owner" });
    expect(await updatePaymentMethod(await actor(), { restaurantId: "ckotherrestaurant0000001", tokenId: tok })).toMatchObject({ code: "restaurant_mismatch" });
    expect(await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: "tkn_live_abcDEF123456" })).toMatchObject({ code: "invalid_input" });
    expect(await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: "4111111111111111" })).toMatchObject({ code: "invalid_input" });
    expect(culqi.adapter.saveCard).not.toHaveBeenCalled();
  });

  it("una suscripción cancelada solo gana la tarjeta (nada que actualizar en Culqi)", async () => {
    await activeTrial();
    await cancelSubscription(await actor(), { restaurantId: RID, confirm: true });
    culqi.adapter.saveCard = vi.fn(async () => ({ kind: "saved" as const, cardId: "crd_test_card3", brand: "Visa", last4: "9999" }));
    const result = await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: tok });
    expect(result).toMatchObject({ ok: true, data: { status: "updated", willRetryCharge: false } });
    expect(culqi.adapter.updateSubscriptionCard).not.toHaveBeenCalled();
    expect(db.subscription.rows[0].providerCardId).toBe("crd_test_card3");
  });
});

describe("operación: reconciliar sin tocar la base a mano", () => {
  beforeEach(() => {
    adminGate.allow = true;
  });

  it("solo el admin de la plataforma; dueños y gerentes no", async () => {
    adminGate.allow = false;
    await expect(getSubscriptionOps()).rejects.toThrow("Not authorized");
    await expect(reconcileSubscriptionNow({ subscriptionId: "ckx000000000000000000001" })).rejects.toThrow();
    await expect(resolveSubscriptionReview({ subscriptionId: "ckx000000000000000000001", note: "ok ok" })).rejects.toThrow();
  });

  it("el panorama cuenta lo que necesita atención y la configuración, sin datos de clientes", async () => {
    await seedPendingSubscription();
    db.subscription.rows[0].createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db.subscriptionWebhookEvent.create({
      data: { provider: "culqi", providerEventId: "evt_test_0000fail", type: "charge.failed", payloadHash: "h", status: "failed", error: "Error" },
    });
    const result = await getSubscriptionOps();
    expect(result.ok && result.data).toMatchObject({
      keys: "ok",
      mode: "test",
      webhookSecretConfigured: true,
      plansConfigured: true,
      counts: { failedEvents: 1, stuckPending: 1 },
    });
    expect(JSON.stringify(result)).not.toMatch(/987654321|Ana|sk_test_secret|dueno@local/);
  });

  it("reconciliar una suscripción aplica lo que Culqi dice (como el cron)", async () => {
    await seedPendingSubscription();
    const result = await reconcileSubscriptionNow({ subscriptionId: db.subscription.rows[0].id });
    expect(result).toMatchObject({ ok: true });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
  });

  it("reprocesar un evento fallido lo termina, y uno ya procesado no se repite", async () => {
    await seedPendingSubscription();
    event("evt_test_0000replay", "subscription.creation.succeeded", { id: "sxn_test_trial1" });
    culqi.down = true;
    await deliver("evt_test_0000replay");
    culqi.down = false;
    db.subscriptionWebhookEvent.rows[0].attempts = 99;
    const id = db.subscriptionWebhookEvent.rows[0].id;
    expect(await reprocessSubscriptionEvent({ eventId: id })).toMatchObject({ ok: true, data: { note: "processed" } });
    expect((await restaurantRow()).billingStatus).toBe("trialing");
    expect(await reprocessSubscriptionEvent({ eventId: id })).toMatchObject({ ok: true, data: { note: "already_processed" } });
  });

  it("cerrar una revisión deja nota y rastro; la bandera se apaga", async () => {
    await activeTrial();
    db.subscription.rows[0].needsReview = true;
    db.subscription.rows[0].reviewReason = "refund";
    const id = db.subscription.rows[0].id;
    expect(await resolveSubscriptionReview({ subscriptionId: id, note: "Devolución de cortesía" })).toMatchObject({ ok: true });
    expect(db.subscription.rows[0]).toMatchObject({ needsReview: false, reviewReason: null });
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({
      actorEmail: "admin@foodflow.site",
    });
    expect(String(db.subscriptionTransition.rows.at(-1)!.reason)).toContain("Devolución de cortesía");
  });

  it("cerrar una suscripción atascada la detiene en Culqi y libera al dueño; si Culqi dice que sí se pagó, se activa", async () => {
    await seedPendingSubscription({ trialDays: 0, providerSubscriptionId: "sxn_test_stuck1" });
    const id = db.subscription.rows[0].id;
    expect(await abandonPendingSubscription({ subscriptionId: id })).toMatchObject({ ok: true, data: { note: "abandoned" } });
    expect(culqi.adapter.cancelSubscription).toHaveBeenCalledWith("sxn_test_stuck1");
    expect(db.subscription.rows[0].endedAt).toBeInstanceOf(Date);
    expect(db.subscriptionCheckout.rows[0]).toMatchObject({ status: "failed", failureCode: "abandoned_by_admin" });
    expect((await restaurantRow()).billingSource).toBe("manual");
  });

  it("cerrar una suscripción que en realidad se pagó la activa en lugar de cerrarla", async () => {
    await seedPendingSubscription({ trialDays: 0, providerSubscriptionId: "sxn_test_paid1" });
    culqi.subs.get("sxn_test_paid1")!.chargeIds = ["chr_test_paid1"];
    culqi.subs.get("sxn_test_paid1")!.nextBillingAt = new Date(Date.now() + 30 * DAY);
    culqi.charges.set("chr_test_paid1", {
      outcome: "succeeded",
      facts: { chargeId: "chr_test_paid1", amountCents: 19942, currency: "PEN", occurredAt: new Date(), failureCode: null },
    });
    const result = await abandonPendingSubscription({ subscriptionId: db.subscription.rows[0].id });
    expect(result).toMatchObject({ ok: true, data: { note: "activated_by_reconcile" } });
    expect(culqi.adapter.cancelSubscription).not.toHaveBeenCalled();
    expect((await restaurantRow()).billingStatus).toBe("active");
  });

  it("un local que se desvió de su suscripción se repara solo con el mantenimiento", async () => {
    await activeTrial();
    // Simulate a path that moved the subscription but not the restaurant.
    db.restaurant.rows[0].billingStatus = "past_due";
    const before = db.subscriptionTransition.rows.length;
    await runSubscriptionMaintenance();
    expect((await restaurantRow()).billingStatus).toBe("trialing");
    expect(db.subscriptionTransition.rows.length).toBe(before + 1);
    expect(db.subscriptionTransition.rows.at(-1)).toMatchObject({ reason: "maintenance.reprojected" });

    db.restaurant.rows[0].plan = "negocio";
    const id = db.subscription.rows[0].id;
    expect(await repairSubscriptionProjection({ subscriptionId: id })).toMatchObject({ ok: true });
    expect((await restaurantRow()).plan).toBe("servicio");
  });
});

describe("coherencia entre suscripción, cobro y permisos efectivos", () => {
  it("cada estado de la suscripción produce el acceso que el contrato promete", async () => {
    await activeTrial();
    const access = async () => restaurantEntitlement((await restaurantRow()) as never);

    expect(await access()).toMatchObject({ mode: "full", reason: "trialing" });

    // trial over and the charge never showed up: grace, not a lock
    db.restaurant.rows[0].accessUntil = new Date(Date.now() - 2 * DAY);
    expect(await access()).toMatchObject({ mode: "grace", reason: "renewal_pending" });

    // grace over
    db.restaurant.rows[0].accessUntil = new Date(Date.now() - 9 * DAY);
    expect(await access()).toMatchObject({ mode: "locked", reason: "grace_expired" });

    // a late payment restores it
    db.subscription.rows[0].trialEndsAt = new Date(Date.now() - 9 * DAY);
    culqi.subs.get("sxn_test_trial1")!.nextBillingAt = new Date(Date.now() + 25 * DAY);
    event("evt_test_0000late", "charge.creation.succeeded", { id: "chr_test_late", amount: 19942, subscription_id: "sxn_test_trial1" });
    await deliver("evt_test_0000late");
    expect(await access()).toMatchObject({ mode: "full", reason: "active" });
  });

  it("el estado que ve el frontend nunca declara pago confirmado mientras la suscripción está pendiente", async () => {
    await seedPendingSubscription();
    culqi.down = true; // Culqi unreachable: the poll must not invent a result
    const view = await getSubscriptionView(await actor());
    expect(view).toMatchObject({
      ok: true,
      data: { source: "manual", openCheckout: { status: "processing" }, subscription: { activatedAt: null } },
    });
    const status = await getCheckoutStatus(await actor(), db.subscriptionCheckout.rows[0].id);
    expect(status).toMatchObject({ ok: true, data: { status: "processing" } });
    expect((await restaurantRow()).billingSource).toBe("manual");
  });

  it("nada que mande el navegador cambia plan, precio, estado o restaurante", async () => {
    await activeTrial();
    const tampered = { restaurantId: RID, confirm: true, plan: "negocio", status: "active", amount: 1, billingSource: "provider" };
    expect(await cancelSubscription(await actor(), tampered as never)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(await changeSubscriptionPlan(await actor(), { restaurantId: RID, targetPlan: "negocio", idempotencyKey: crypto.randomUUID(), confirm: true, amount: 1 } as never)).toMatchObject({ code: "invalid_input" });
    expect(await updatePaymentMethod(await actor(), { restaurantId: RID, tokenId: "tkn_test_abcDEF123456", plan: "negocio" } as never)).toMatchObject({ code: "invalid_input" });
    expect((await restaurantRow()).plan).toBe("servicio");
  });
});

// =====================================================================
// Endurecimiento de seguridad
// =====================================================================

describe("webhook: cuerpo acotado y secreto sin filtrar su largo", () => {
  it("un cuerpo enorme sin Content-Length se corta al llegar al límite", async () => {
    const chunk = new Uint8Array(16 * 1024).fill(97);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        // Would run forever if the receiver kept reading.
        sent += chunk.byteLength;
        controller.enqueue(chunk);
        if (sent > 4 * 1024 * 1024) controller.close();
      },
    });
    const reply = await receiveCulqiWebhook(
      new Request("https://foodflow.site/api/subscriptions/webhooks/culqi", {
        method: "POST",
        headers: { authorization: `Basic ${Buffer.from(`culqi:${SECRET}`).toString("base64")}` },
        body,
        duplex: "half",
      } as RequestInit)
    );
    expect(reply.status).toBe(413);
    expect(sent).toBeLessThan(1024 * 1024); // stopped reading long before the end
    expect(db.subscriptionWebhookEvent.rows).toHaveLength(0);
  });

  it("un secreto de otro largo se rechaza igual que uno equivocado", async () => {
    for (const wrong of ["x", "x".repeat(200)]) {
      const reply = await deliver("evt_test_0000abcd", `Bearer ${wrong}`);
      expect(reply.status).toBe(401);
    }
  });
});

describe("retención de datos personales", () => {
  const day = 24 * 60 * 60 * 1000;

  async function attempt(status: string, ageDays: number) {
    const row = await db.subscriptionCheckout.create({
      data: {
        restaurantId: RID, userId: OWNER.id, userEmail: OWNER.email,
        idempotencyKey: crypto.randomUUID(), status, plan: "servicio", provider: "culqi",
        providerPlanId: PLAN_ENV.CULQI_PLAN_SERVICIO, withTrial: false, trialDays: 0, currency: "PEN",
        netAmountCents: 16900, igvAmountCents: 3042, grossAmountCents: 19942, igvRateBps: 1800,
        customerFirstName: "Ana", customerLastName: "Quispe", customerPhone: "987654321",
        customerAddress: "Av. Lima 123", customerCity: "Lima",
        billingDocType: "factura", billingRuc: "20131312955", billingLegalName: "Mi Local SAC",
        returnPath: "/dashboard/app/configuracion", termsAcceptedAt: new Date(), termsVersion: "v",
        expiresAt: new Date(),
      },
    });
    db.subscriptionCheckout.rows.find((r) => r.id === row.id)!.updatedAt = new Date(Date.now() - ageDays * day);
    return row.id;
  }

  it("borra los datos del titular de intentos fallidos viejos y conserva los completados", async () => {
    await seedRestaurant();
    const oldFailed = await attempt("failed", 45);
    const oldExpired = await attempt("expired", 45);
    const freshFailed = await attempt("failed", 5);
    const completed = await attempt("completed", 400);
    await runSubscriptionMaintenance();

    const get = (id: string) => db.subscriptionCheckout.rows.find((r) => r.id === id)!;
    for (const id of [oldFailed, oldExpired]) {
      expect(get(id)).toMatchObject({
        customerFirstName: "-", customerLastName: "-", customerPhone: "-", customerAddress: "-", customerCity: "-",
        billingRuc: null, billingLegalName: null,
      });
    }
    expect(get(freshFailed).customerFirstName).toBe("Ana"); // too recent
    expect(get(completed)).toMatchObject({ customerFirstName: "Ana", billingRuc: "20131312955" }); // the receipt needs it
  });

  it("poda los eventos ya procesados de más de 90 días y conserva los que fallaron", async () => {
    const mk = (id: string, status: string, ageDays: number) =>
      db.subscriptionWebhookEvent.create({
        // attempts 99: past the retry cap, so only retention looks at it.
        data: { provider: "culqi", providerEventId: id, type: "charge.failed", payloadHash: "h", status, attempts: 99, receivedAt: new Date(Date.now() - ageDays * day) },
      });
    await mk("evt_test_0000old1", "processed", 120);
    await mk("evt_test_0000old2", "ignored", 100);
    await mk("evt_test_0000new1", "processed", 10);
    await mk("evt_test_0000bad1", "failed", 120);
    await runSubscriptionMaintenance();
    expect(db.subscriptionWebhookEvent.rows.map((e) => e.providerEventId).sort()).toEqual([
      "evt_test_0000bad1",
      "evt_test_0000new1",
    ]);
  });
});
