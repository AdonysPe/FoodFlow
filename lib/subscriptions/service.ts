// FoodFlow subscriptions: open a checkout, turn the card token into a Culqi
// subscription, and report where a restaurant stands.
//
// `confirmCheckout` never activates anything: it ends with the subscription
// created at Culqi and the checkout in `processing`. The restaurant's plan,
// status and access are moved only by lib/subscriptions/lifecycle.ts, after
// Culqi confirms server to server (a re-read webhook event, or a direct read
// of the subscription). Nothing the browser sends — a return URL, a query
// string, a "success" callback — can change what a restaurant may use.
//
// Callers resolve the session (lib/actions/subscription.ts); every function
// here re-checks ownership against the rows it touches.
//
// Server only.

import { Prisma, type SubscriptionCheckout } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { SITE_URL } from "@/lib/seo";
import { PLANS, PLAN_LABELS, type PlanValue } from "@/lib/plans";
import { rateLimit } from "@/lib/security/rateLimit";
import { readCulqiConfig, type CulqiConfig } from "@/lib/subscriptions/config";
import { restaurantEntitlement } from "@/lib/subscriptions/access";
import { adapterFor, fail, logSubscription, onAdapterReset } from "@/lib/subscriptions/runtime";
import { accessUntilOf } from "@/lib/subscriptions/lifecycle";
import { reconcileCheckout } from "@/lib/subscriptions/reconcile";
import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
import {
  SUBSCRIPTION_TERMS_VERSION,
  TRIAL_DAYS,
  priceFor,
  type PriceSummary,
} from "@/lib/subscriptions/pricing";
import {
  confirmCheckoutInputSchema,
  createCheckoutInputSchema,
  safeReturnPath,
  type CheckoutStatusOutput,
  type ConfirmCheckoutOutput,
  type CreateCheckoutOutput,
  type SubscriptionErrorCode,
  type SubscriptionResult,
  type SubscriptionView,
} from "@/lib/subscriptions/contract";
import type { BillingSourceValue, BillingStatusValue } from "@/lib/subscriptions/entitlement";

// ------------------------------------------------------------------ shared

export type SubscriptionActor = {
  user: { id: string; email: string };
  restaurant: {
    id: string;
    name: string;
    ownerId: string;
    plan: string;
    billingStatus: string;
    billingSource: string;
    accessUntil: Date | null;
  } | null;
  isOwner: boolean;
};

const CHECKOUT_TTL_MS = 30 * 60 * 1000;
/** How long a confirm in flight holds the checkout. Longer than 3 provider calls. */
const CONFIRM_LOCK_MS = 90 * 1000;
const PLAN_CHECK_TTL_MS = 10 * 60 * 1000;

/** Subscription states that still hold (or are about to hold) the plan. */
const LIVE_SUBSCRIPTION_STATUSES: BillingStatusValue[] = ["trialing", "active", "past_due"];

export { logSubscription, setAdapterFactoryForTests } from "@/lib/subscriptions/runtime";

type ConfigCheck = { ok: true; config: CulqiConfig } | { ok: false; result: SubscriptionResult<never> };

function requireConfig(): ConfigCheck {
  const read = readCulqiConfig();
  if (read.ok) return { ok: true, config: read.config };
  if (read.reason === "disabled") return { ok: false, result: fail("subscriptions_disabled") };
  logSubscription("error", "config.invalid", { problems: read.problems });
  return { ok: false, result: fail("provider_misconfigured") };
}

function returnUrlFor(checkoutId: string, returnPath: string): string {
  const url = new URL(returnPath, SITE_URL);
  url.searchParams.set("checkout", checkoutId);
  return url.toString();
}

async function trialEligible(
  db: Prisma.TransactionClient | typeof prisma,
  restaurantId: string
): Promise<boolean> {
  const used = await db.subscription.findFirst({
    where: { restaurantId, trialUsedAt: { not: null } },
    select: { id: true },
  });
  return used == null;
}

// ------------------------------------------------ plan price verification

const planChecks = new Map<string, number>();
onAdapterReset(() => planChecks.clear());

/**
 * The plan at Culqi must charge exactly what our catalogue says, in soles, and
 * the trial variant must actually start with free cycles. Checked before the
 * owner types a card, so a misconfigured plan fails here and not on a bank
 * statement. Cached briefly per instance.
 */
async function verifyProviderPlan(
  adapter: SubscriptionProviderAdapter,
  planId: string,
  price: PriceSummary,
  withTrial: boolean
): Promise<"ok" | "mismatch"> {
  const cachedAt = planChecks.get(planId);
  if (cachedAt && Date.now() - cachedAt < PLAN_CHECK_TTL_MS) return "ok";

  const check = await adapter.getPlan(planId);
  const problems: string[] = [];
  if (check.amountCents !== price.grossCents) problems.push("amount");
  if (check.currency !== price.currency) problems.push("currency");
  if (check.hasFreeInitialCycles !== null && check.hasFreeInitialCycles !== withTrial) {
    problems.push("trial");
  }
  if (problems.length > 0) {
    logSubscription("error", "plan.mismatch", {
      planId,
      problems,
      expectedCents: price.grossCents,
      providerCents: check.amountCents,
    });
    return "mismatch";
  }
  planChecks.set(planId, Date.now());
  return "ok";
}

// --------------------------------------------------------- create checkout

function checkoutOutput(row: SubscriptionCheckout, config: CulqiConfig): CreateCheckoutOutput {
  return {
    checkoutId: row.id,
    status: row.status,
    plan: row.plan,
    price: {
      currency: "PEN",
      interval: "month",
      netCents: row.netAmountCents,
      igvCents: row.igvAmountCents,
      grossCents: row.grossAmountCents,
      igvRateBps: row.igvRateBps,
      discountBps: row.discountBps,
    },
    trialDays: row.withTrial ? row.trialDays : 0,
    expiresAt: row.expiresAt.toISOString(),
    next: {
      type: "culqi_checkout",
      publicKey: config.publicKey,
      settings: {
        title: `FoodFlow · Plan ${PLAN_LABELS[row.plan]}`,
        currency: "PEN",
        amount: row.grossAmountCents,
      },
      paymentMethods: { tarjeta: true },
      threeDSReturnUrl: returnUrlFor(row.id, row.returnPath),
    },
  };
}

class CheckoutConflict extends Error {
  constructor(readonly code: SubscriptionErrorCode) {
    super(code);
  }
}

export async function createCheckout(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<CreateCheckoutOutput>> {
  const parsed = createCheckoutInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Our own refinements carry Spanish text; zod's defaults do not.
    const message = issue?.code === "custom" ? issue.message : undefined;
    return fail("invalid_input", message);
  }
  const input = parsed.data;

  if (!actor.isOwner) return fail("forbidden_not_owner");
  const restaurant = actor.restaurant;
  if (!restaurant || restaurant.id !== input.restaurantId || restaurant.ownerId !== actor.user.id) {
    return fail("restaurant_mismatch");
  }

  const cfg = requireConfig();
  if (!cfg.ok) return cfg.result;
  const { config } = cfg;

  const limit = await rateLimit("subscription-checkout", actor.user.id, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return fail("rate_limited");

  const plan = input.plan;
  const price = priceFor(plan);
  const withTrial = await trialEligible(prisma, restaurant.id);
  const providerPlanId = withTrial ? config.planIds[plan].trial : config.planIds[plan].regular;

  const adapter = adapterFor(config);
  try {
    if ((await verifyProviderPlan(adapter, providerPlanId, price, withTrial)) === "mismatch") {
      return fail("provider_misconfigured");
    }
  } catch (error) {
    logSubscription("error", "plan.check_failed", { planId: providerPlanId, error: String(error) });
    return fail(error instanceof ProviderUnavailableError ? "provider_unavailable" : "provider_misconfigured");
  }

  const now = new Date();
  const returnPath = safeReturnPath(input.returnPath);

  try {
    const row = await prisma.$transaction(async (tx) => {
      // Serializes every checkout of this restaurant: two tabs, a double
      // click, or two owners' devices can never open two live purchases.
      await tx.$queryRaw`SELECT "id" FROM "Restaurant" WHERE "id" = ${restaurant.id} FOR UPDATE`;

      const existing = await tx.subscriptionCheckout.findUnique({
        where: {
          restaurantId_idempotencyKey: {
            restaurantId: restaurant.id,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.plan !== plan) throw new CheckoutConflict("idempotency_conflict");
        return existing;
      }

      const live = await tx.subscription.findFirst({
        where: {
          restaurantId: restaurant.id,
          OR: [
            { status: { in: LIVE_SUBSCRIPTION_STATUSES } },
            // Created at Culqi, not yet confirmed: a second one would be a
            // second charge.
            { status: "pending", endedAt: null },
          ],
        },
        select: { status: true },
      });
      if (live) {
        throw new CheckoutConflict(live.status === "pending" ? "checkout_in_progress" : "already_subscribed");
      }

      const busy = await tx.subscriptionCheckout.findFirst({
        where: {
          restaurantId: restaurant.id,
          OR: [
            { status: "processing" },
            { status: { in: ["created", "requires_action"] }, lockedUntil: { gt: now } },
          ],
        },
        select: { id: true },
      });
      if (busy) throw new CheckoutConflict("checkout_in_progress");

      if ((await trialEligible(tx, restaurant.id)) !== withTrial) {
        throw new CheckoutConflict("checkout_in_progress");
      }

      // An earlier attempt nobody finished (another plan, a closed tab) is
      // superseded, so only the newest one can reach the provider.
      await tx.subscriptionCheckout.updateMany({
        where: { restaurantId: restaurant.id, status: { in: ["created", "requires_action"] } },
        data: { status: "canceled", lockedUntil: null },
      });

      const doc = input.billingDocument;
      return tx.subscriptionCheckout.create({
        data: {
          restaurantId: restaurant.id,
          userId: actor.user.id,
          userEmail: actor.user.email,
          idempotencyKey: input.idempotencyKey,
          plan,
          provider: "culqi",
          providerPlanId,
          withTrial,
          trialDays: withTrial ? TRIAL_DAYS : 0,
          currency: price.currency,
          netAmountCents: price.netCents,
          igvAmountCents: price.igvCents,
          grossAmountCents: price.grossCents,
          igvRateBps: price.igvRateBps,
          discountBps: price.discountBps,
          customerFirstName: input.customer.firstName,
          customerLastName: input.customer.lastName,
          customerPhone: input.customer.phone,
          customerAddress: input.customer.address,
          customerCity: input.customer.city,
          billingDocType: doc.type,
          billingRuc: doc.type === "factura" ? doc.ruc : null,
          billingLegalName: doc.type === "factura" ? doc.legalName : null,
          returnPath,
          termsAcceptedAt: now,
          termsVersion: SUBSCRIPTION_TERMS_VERSION,
          expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MS),
        },
      });
    });

    logSubscription("info", "checkout.created", {
      checkoutId: row.id,
      restaurantId: restaurant.id,
      plan: row.plan,
      withTrial: row.withTrial,
    });
    return { ok: true, data: checkoutOutput(row, config) };
  } catch (error) {
    if (error instanceof CheckoutConflict) return fail(error.code);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // The same idempotency key raced itself; the first insert won.
      return fail("checkout_in_progress");
    }
    throw error;
  }
}

// -------------------------------------------------------- confirm checkout

export async function confirmCheckout(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<ConfirmCheckoutOutput>> {
  const parsed = confirmCheckoutInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const input = parsed.data;

  if (!actor.isOwner) return fail("forbidden_not_owner");
  const restaurant = actor.restaurant;
  if (!restaurant || restaurant.ownerId !== actor.user.id) return fail("restaurant_mismatch");

  const cfg = requireConfig();
  if (!cfg.ok) return cfg.result;
  const { config } = cfg;

  // A token from the other mode can only be a mistake (or a probe).
  if (!input.tokenId.startsWith(`tkn_${config.mode}_`)) return fail("invalid_input");

  const limit = await rateLimit("subscription-confirm", actor.user.id, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) return fail("rate_limited");

  const checkout = await prisma.subscriptionCheckout.findFirst({
    where: { id: input.checkoutId, restaurantId: restaurant.id },
  });
  if (!checkout) return fail("checkout_not_found");

  if (checkout.status === "processing") {
    return { ok: true, data: { status: "processing", checkoutId: checkout.id } };
  }
  if (checkout.status === "completed") {
    return { ok: true, data: { status: "completed", checkoutId: checkout.id } };
  }
  if (checkout.status !== "created" && checkout.status !== "requires_action") {
    return fail("checkout_closed");
  }

  const now = new Date();
  if (checkout.expiresAt <= now) {
    await prisma.subscriptionCheckout.updateMany({
      where: { id: checkout.id, status: { in: ["created", "requires_action"] } },
      data: { status: "expired", lockedUntil: null },
    });
    return fail("checkout_expired");
  }

  // Claim: only one confirm per checkout reaches the provider at a time.
  const claim = await prisma.subscriptionCheckout.updateMany({
    where: {
      id: checkout.id,
      status: { in: ["created", "requires_action"] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: {
      lockedUntil: new Date(now.getTime() + CONFIRM_LOCK_MS),
      attempts: { increment: 1 },
    },
  });
  if (claim.count === 0) return fail("checkout_in_progress");

  const release = (data: Prisma.SubscriptionCheckoutUpdateManyMutationInput) =>
    prisma.subscriptionCheckout.updateMany({
      where: { id: checkout.id, status: { in: ["created", "requires_action"] } },
      data: { lockedUntil: null, ...data },
    });

  const adapter = adapterFor(config);
  const metadata = { restaurant_id: restaurant.id, checkout_id: checkout.id };

  // 1. Customer and card. A failure here leaves nothing charged.
  let customerId: string;
  let card: { cardId: string; brand: string | null; last4: string | null };
  try {
    const known = await prisma.subscription.findFirst({
      where: { ownerId: actor.user.id, provider: "culqi", providerCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { providerCustomerId: true },
    });
    customerId =
      known?.providerCustomerId ??
      (
        await adapter.ensureCustomer({
          email: actor.user.email,
          firstName: checkout.customerFirstName,
          lastName: checkout.customerLastName,
          phone: checkout.customerPhone,
          address: checkout.customerAddress,
          city: checkout.customerCity,
          metadata: { owner_id: actor.user.id },
        })
      ).customerId;

    const saved = await adapter.saveCard({
      customerId,
      tokenId: input.tokenId,
      authentication3DS: input.authentication3DS,
      metadata,
    });

    if (saved.kind === "requires_3ds") {
      await release({ status: "requires_action" });
      return {
        ok: true,
        data: {
          status: "requires_action",
          checkoutId: checkout.id,
          threeDS: {
            email: actor.user.email,
            totalAmount: checkout.grossAmountCents,
            returnUrl: returnUrlFor(checkout.id, checkout.returnPath),
          },
        },
      };
    }
    if (saved.kind === "declined") {
      await release({ status: "created", failureCode: "card_declined" });
      logSubscription("warn", "card.declined", { checkoutId: checkout.id, code: saved.code });
      return fail("card_declined", saved.userMessage ?? undefined);
    }
    card = saved;
  } catch (error) {
    await release({ failureCode: error instanceof ProviderRejectedError ? error.providerCode : "provider_unavailable" });
    logSubscription("error", "confirm.card_stage_failed", { checkoutId: checkout.id, error: String(error) });
    if (error instanceof ProviderRejectedError) {
      return error.operation === "customer.create"
        ? fail("invalid_input", "La pasarela rechazó los datos del titular. Revísalos.")
        : fail("card_declined", "No pudimos guardar la tarjeta. Vuelve a ingresarla.");
    }
    if (error instanceof ProviderUnavailableError) return fail("provider_unavailable");
    throw error;
  }

  // 2. The subscription. From here a failure may have charged the card.
  let providerSubscriptionId: string | null = null;
  let outcome: "created" | "unknown" = "created";
  try {
    const created = await adapter.createSubscription({
      cardId: card.cardId,
      planId: checkout.providerPlanId,
      metadata,
    });
    providerSubscriptionId = created.subscriptionId;
  } catch (error) {
    if (error instanceof ProviderRejectedError) {
      await release({ status: "created", failureCode: error.providerCode ?? "subscription_rejected" });
      logSubscription("warn", "subscription.rejected", {
        checkoutId: checkout.id,
        status: error.status,
        code: error.providerCode,
      });
      return error.providerCode === "card_error"
        ? fail("card_declined")
        : fail("provider_unavailable");
    }
    if (!(error instanceof ProviderUnavailableError)) throw error;
    // Timeout or 5xx: Culqi may have created it. Do NOT let the owner retry
    // into a second subscription — park it for reconciliation instead.
    outcome = "unknown";
    logSubscription("error", "subscription.unknown_outcome", { checkoutId: checkout.id });
  }

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        ownerId: actor.user.id,
        ownerEmail: actor.user.email,
        provider: "culqi",
        providerCustomerId: customerId,
        providerCardId: card.cardId,
        providerSubscriptionId,
        providerPlanId: checkout.providerPlanId,
        plan: checkout.plan,
        status: "pending",
        currency: checkout.currency,
        netAmountCents: checkout.netAmountCents,
        igvAmountCents: checkout.igvAmountCents,
        grossAmountCents: checkout.grossAmountCents,
        igvRateBps: checkout.igvRateBps,
        discountBps: checkout.discountBps,
        trialDays: checkout.withTrial ? checkout.trialDays : 0,
        // Spent as soon as the provider may have it, even if unconfirmed.
        trialUsedAt: checkout.withTrial ? now : null,
        cardBrand: card.brand,
        cardLast4: card.last4,
      },
    });
    await tx.subscriptionCheckout.update({
      where: { id: checkout.id },
      data: {
        status: "processing",
        lockedUntil: null,
        subscriptionId: subscription.id,
        failureCode: outcome === "unknown" ? "unknown_outcome" : null,
      },
    });
  });

  logSubscription("info", "subscription.created", {
    checkoutId: checkout.id,
    restaurantId: restaurant.id,
    outcome,
  });
  return { ok: true, data: { status: "processing", checkoutId: checkout.id } };
}

// ------------------------------------------------------------- read models

export async function getCheckoutStatus(
  actor: SubscriptionActor,
  checkoutId: unknown
): Promise<SubscriptionResult<CheckoutStatusOutput>> {
  if (typeof checkoutId !== "string" || checkoutId.length > 40) return fail("invalid_input");
  const restaurant = actor.restaurant;
  if (!restaurant) return fail("restaurant_mismatch");

  const find = () =>
    prisma.subscriptionCheckout.findFirst({ where: { id: checkoutId, restaurantId: restaurant.id } });
  let row = await find();
  if (!row) return fail("checkout_not_found");

  if (row.status === "processing") {
    // The panel polls this every few seconds. Ask Culqi directly (throttled)
    // so a started trial shows up even if the webhook is late or lost.
    await reconcileCheckout(row.id);
    row = (await find()) ?? row;
  }

  if ((row.status === "created" || row.status === "requires_action") && row.expiresAt <= new Date()) {
    await prisma.subscriptionCheckout.updateMany({
      where: { id: row.id, status: { in: ["created", "requires_action"] } },
      data: { status: "expired", lockedUntil: null },
    });
    row = { ...row, status: "expired" };
  }

  return {
    ok: true,
    data: {
      checkoutId: row.id,
      status: row.status,
      purpose: row.purpose,
      plan: row.plan,
      trialDays: row.withTrial ? row.trialDays : 0,
      failureCode: row.failureCode,
      returnPath: row.returnPath,
      expiresAt: row.expiresAt.toISOString(),
    },
  };
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export async function getSubscriptionView(
  actor: SubscriptionActor
): Promise<SubscriptionResult<SubscriptionView>> {
  if (!actor.restaurant) return fail("restaurant_mismatch");
  const restaurantId = actor.restaurant.id;

  const now = new Date();
  const [fresh, current, latest, openCheckout, eligible] = await Promise.all([
    // Re-read: a reconciliation earlier in this request may have moved it.
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { plan: true, billingStatus: true, billingSource: true, accessUntil: true },
    }),
    prisma.subscription.findFirst({
      where: { restaurantId, activatedAt: { not: null }, endedAt: null },
      orderBy: { activatedAt: "desc" },
    }),
    prisma.subscription.findFirst({ where: { restaurantId }, orderBy: { createdAt: "desc" } }),
    prisma.subscriptionCheckout.findFirst({
      where: {
        restaurantId,
        OR: [
          { status: "processing" },
          { status: { in: ["created", "requires_action"] }, expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    trialEligible(prisma, restaurantId),
  ]);
  const restaurant = fresh ?? actor.restaurant;
  const subscription = current ?? latest;
  const lastPayment = subscription
    ? await prisma.subscriptionPayment.findFirst({
        where: { subscriptionId: subscription.id },
        orderBy: { occurredAt: "desc" },
      })
    : null;

  const entitlement = restaurantEntitlement(restaurant, now);
  const trialDays = eligible ? TRIAL_DAYS : 0;
  const managedByCard = restaurant.billingSource === "provider" && current != null;
  const accessUntil = subscription ? accessUntilOf(subscription) : null;

  return {
    ok: true,
    data: {
      restaurantId,
      canManage: actor.isOwner,
      checkoutEnabled: readCulqiConfig().ok,
      source: restaurant.billingSource as BillingSourceValue,
      plan: restaurant.plan as PlanValue,
      status: restaurant.billingStatus as BillingStatusValue,
      access: {
        mode: entitlement.mode,
        effectivePlan: entitlement.effectivePlan,
        reason: entitlement.reason,
        until: iso(entitlement.until),
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            price: {
              currency: "PEN",
              interval: "month",
              netCents: subscription.netAmountCents,
              igvCents: subscription.igvAmountCents,
              grossCents: subscription.grossAmountCents,
              igvRateBps: subscription.igvRateBps,
              discountBps: subscription.discountBps,
            },
            trialEndsAt: iso(subscription.trialEndsAt),
            currentPeriodEnd: iso(subscription.currentPeriodEnd),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            card: { brand: subscription.cardBrand, last4: subscription.cardLast4 },
            activatedAt: iso(subscription.activatedAt),
            accessUntil: iso(accessUntil),
            canceledAt: iso(subscription.canceledAt),
            pendingChange:
              subscription.pendingPlan && subscription.pendingPlanEffectiveAt
                ? { plan: subscription.pendingPlan, effectiveAt: subscription.pendingPlanEffectiveAt.toISOString() }
                : null,
            lastPayment: lastPayment
              ? {
                  status: lastPayment.status,
                  grossCents: lastPayment.amountCents,
                  at: lastPayment.occurredAt.toISOString(),
                  failureCode: lastPayment.failureCode,
                }
              : null,
          }
        : null,
      actions: {
        canCancel:
          actor.isOwner &&
          managedByCard &&
          ["trialing", "active", "past_due"].includes(current!.status) &&
          openCheckout?.status !== "processing",
        canChangePlan:
          actor.isOwner &&
          managedByCard &&
          ["trialing", "active"].includes(current!.status) &&
          !current!.pendingPlan &&
          openCheckout?.status !== "processing",
      },
      openCheckout: openCheckout
        ? {
            id: openCheckout.id,
            status: openCheckout.status,
            plan: openCheckout.plan,
            expiresAt: openCheckout.expiresAt.toISOString(),
          }
        : null,
      trial: { eligible, days: TRIAL_DAYS },
      offers: PLANS.map((plan) => ({ plan, price: priceFor(plan), trialDays })),
    },
  };
}
