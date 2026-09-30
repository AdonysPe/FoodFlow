import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakePrisma } from "./helpers/fakePrisma";

vi.mock("@/lib/db/prisma", async () => {
  const { createFakePrisma } = await import("./helpers/fakePrisma");
  return { prisma: createFakePrisma() };
});
vi.mock("@/lib/security/rateLimit", () => ({ rateLimit: async () => ({ ok: true, remaining: 9 }) }));

import { prisma } from "@/lib/db/prisma";
import { receiveCulqiWebhook, authenticateDelivery } from "../lib/subscriptions/webhooks";
import { runSubscriptionMaintenance } from "../lib/subscriptions/maintenance";
import { cancelSubscription, changeSubscriptionPlan, previewPlanChange } from "../lib/subscriptions/operations";
import { getCheckoutStatus, getSubscriptionView, setAdapterFactoryForTests, type SubscriptionActor } from "../lib/subscriptions/service";
import { restaurantEntitlement } from "../lib/subscriptions/access";
import { addMonths } from "../lib/subscriptions/lifecycle";
import { chargeFacts, classifyEvent, collectIds, providerDate } from "../lib/subscriptions/events";
import { createCulqiAdapter } from "../lib/subscriptions/culqi";
import {
  ProviderUnavailableError,
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
  subs: Map<string, ProviderSubscriptionState>;
  adapter: SubscriptionProviderAdapter;
  down: boolean;
};

let culqi: FakeCulqi;
let subSeq = 0;

function makeCulqi(): FakeCulqi {
  const state: FakeCulqi = { events: new Map(), subs: new Map(), down: false } as FakeCulqi;
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
      state.subs.set(id, { id, status: "active", cardId, planId, trialEndsAt: null, nextBillingAt: null, createdAt: new Date() });
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

  it("un evento que Culqi no tiene (falsificado) se ignora sin tocar nada", async () => {
    await seedPendingSubscription();
    const reply = await deliver("evt_test_0000forged");
    expect(reply.status).toBe(200);
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
    expect(view.ok && view.data.actions).toEqual({ canCancel: true, canChangePlan: false });

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
