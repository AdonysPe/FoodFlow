// Culqi webhook: authenticate the delivery, store the event once, re-read it
// from Culqi, and hand the facts to the lifecycle.
//
// HOW AUTHENTICITY IS ESTABLISHED. Culqi does not publish a signature scheme
// for its webhooks (docs.culqi.com, "Webhooks"; its SDKs expose no verifier).
// So there are two independent checks, and the second is the one that
// matters:
//   1. The delivery must carry CULQI_WEBHOOK_SECRET (Basic auth password,
//      Bearer token, or `token` query parameter — whichever the CulqiPanel
//      webhook form allows). Without it nothing is stored or fetched.
//   2. The body is NEVER acted on. Only its event id is read; the event is
//      then fetched from Culqi's API with our secret key (GET /v2/events/{id})
//      and the subscription re-read (GET /v2/recurrent/subscriptions/{id}).
//      A forged body can at most make us ask Culqi a question.
// If Culqi later ships a signature, it is verified here, over `rawBody`.
//
// IDEMPOTENCY. (provider, providerEventId) is unique. A processed event is
// acknowledged without work; one being processed elsewhere is acknowledged
// and left alone; a failed one is retried by the next delivery or by the daily
// maintenance. Payments are unique by charge id, so even a replay that got
// past this could not count a charge twice.
//
// Server only.

import { createHash } from "node:crypto";
import { safeEqual } from "@/lib/security/bearer";
import { Prisma, type Subscription } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { readCulqiKeys, readWebhookSecret } from "@/lib/subscriptions/config";
import {
  asRecord,
  chargeFacts,
  classifyEvent,
  collectIds,
  normalizeSubscription,
  str,
  type EventKind,
} from "@/lib/subscriptions/events";
import {
  applyChargeFailed,
  applyChargeSucceeded,
  applyProviderState,
  applyRefund,
  loadLocked,
  type LifecycleOutcome,
} from "@/lib/subscriptions/lifecycle";
import { ProviderUnavailableError, type SubscriptionProviderAdapter } from "@/lib/subscriptions/provider";
import { reconcileSubscription, stopAtProvider } from "@/lib/subscriptions/reconcile";
import { rateLimit } from "@/lib/security/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";
import { alertOps, lifecycleAdapter, logSubscription, safeError } from "@/lib/subscriptions/runtime";

const MAX_BODY_BYTES = 64 * 1024;
const PROCESSING_LOCK_MS = 2 * 60 * 1000;
/** The provider's event API may lag its own webhook. */
const EVENT_VISIBILITY_WINDOW_MS = 15 * 60 * 1000;
/** An event can arrive before we have committed the subscription it is about. */
const UNMATCHED_WINDOW_MS = 24 * 60 * 60 * 1000;
const EVENT_ID = /^evt_(test|live)_[A-Za-z0-9]{6,64}$/;

// ------------------------------------------------------------ auth

// Compared as digests (lib/security/bearer.ts): a length check before the
// comparison would tell a caller how long the secret is.
const same = safeEqual;

/**
 * The body, read as a stream and cut off at the limit. `Content-Length` is
 * only what the sender says; a chunked request has none, and reading it whole
 * before measuring would let an oversized body cost memory first.
 */
async function readCapped(request: Request, limit: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function authenticateDelivery(headers: Headers, url: URL, secret: string): boolean {
  const auth = headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : "";
    if (password && same(password, secret)) return true;
  }
  if (auth.startsWith("Bearer ") && same(auth.slice(7), secret)) return true;
  const token = url.searchParams.get("token");
  return token != null && same(token, secret);
}

// ------------------------------------------------------------ entry

type Reply = { status: number; body: Record<string, unknown> };

export async function receiveCulqiWebhook(request: Request): Promise<Reply> {
  const secret = readWebhookSecret();
  if (!secret) {
    logSubscription("error", "webhook.misconfigured", { reason: "CULQI_WEBHOOK_SECRET ausente o corto" });
    return { status: 503, body: { ok: false } };
  }
  if (!authenticateDelivery(request.headers, new URL(request.url), secret)) {
    logSubscription("warn", "webhook.unauthenticated", {});
    // Guessing a 32+ character secret is hopeless, but every wrong guess
    // should not be free either: cap failures per source.
    const limit = await rateLimit("culqi-webhook-auth", await callerIpHash().catch(() => "unknown"), {
      max: 30,
      windowMs: 10 * 60 * 1000,
    }).catch(() => ({ ok: true as const, remaining: 0 }));
    return { status: limit.ok ? 401 : 429, body: { ok: false } };
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return { status: 413, body: { ok: false } };
  const rawBody = await readCapped(request, MAX_BODY_BYTES);
  if (rawBody === null) return { status: 413, body: { ok: false } };

  let parsed: Record<string, unknown>;
  try {
    parsed = asRecord(JSON.parse(rawBody));
  } catch {
    return { status: 400, body: { ok: false } };
  }
  const eventId = str(parsed.id);
  const type = str(parsed.type)?.slice(0, 80) ?? "unknown";
  if (!eventId || !EVENT_ID.test(eventId)) return { status: 400, body: { ok: false } };

  // An event from the other mode (test vs live) is not ours to process.
  const keys = readCulqiKeys();
  if (keys.ok && !eventId.startsWith(`evt_${keys.keys.mode}_`)) {
    logSubscription("warn", "webhook.wrong_mode", { eventId });
    return { status: 200, body: { ok: true, ignored: true } };
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  let row: { id: string; status: string; payloadHash: string };
  try {
    row = await prisma.subscriptionWebhookEvent.create({
      // The body itself is not kept: it can carry customer and card details
      // we have no use for. The event is re-read from Culqi anyway.
      data: { provider: "culqi", providerEventId: eventId, type, payloadHash, payload: { type } },
      select: { id: true, status: true, payloadHash: true },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const existing = await prisma.subscriptionWebhookEvent.findUnique({
      where: { provider_providerEventId: { provider: "culqi", providerEventId: eventId } },
      select: { id: true, status: true, payloadHash: true },
    });
    if (!existing) throw error;
    if (existing.payloadHash !== payloadHash) {
      logSubscription("warn", "webhook.payload_changed", { eventId });
    }
    if (existing.status === "processed" || existing.status === "ignored") {
      return { status: 200, body: { ok: true, duplicate: true } };
    }
    row = existing;
  }

  const result = await processStoredEvent(row.id);
  switch (result) {
    case "processed":
    case "ignored":
    case "in_flight":
    case "pending":
      // `pending`: nothing of ours matches yet (the event can outrun the
      // commit of the subscription it is about). Acknowledged, because it is
      // not a provider outage, and kept for the maintenance retry.
      return { status: 200, body: { ok: true, result } };
    case "retry":
      // Culqi (or its API) is unavailable: ask for a redelivery.
      return { status: 503, body: { ok: false, retry: true } };
    default:
      return { status: 500, body: { ok: false } };
  }
}

// ------------------------------------------------------- processing

export type ProcessResult = "processed" | "ignored" | "pending" | "in_flight" | "retry" | "error";

/** Process (or retry) one stored event. Used by the route and by maintenance. */
export async function processStoredEvent(rowId: string, now: Date = new Date()): Promise<ProcessResult> {
  const claim = await prisma.subscriptionWebhookEvent.updateMany({
    where: {
      id: rowId,
      OR: [
        { status: { in: ["received", "failed"] } },
        { status: "processing", lockedUntil: { lt: now } },
      ],
    },
    data: {
      status: "processing",
      lockedUntil: new Date(now.getTime() + PROCESSING_LOCK_MS),
      attempts: { increment: 1 },
    },
  });
  if (claim.count === 0) return "in_flight";

  const row = await prisma.subscriptionWebhookEvent.findUnique({ where: { id: rowId } });
  if (!row) return "error";

  const finish = (
    status: "processed" | "ignored" | "failed",
    data: { note: string; kind?: EventKind; subscriptionId?: string | null; error?: string | null }
  ) =>
    prisma.subscriptionWebhookEvent.update({
      where: { id: rowId },
      data: {
        status,
        lockedUntil: null,
        processedAt: status === "failed" ? null : now,
        subscriptionId: data.subscriptionId ?? row.subscriptionId,
        error: data.error ?? null,
        payload: { type: row.type, kind: data.kind ?? null, note: data.note },
      },
    });

  const adapter = lifecycleAdapter();
  if (!adapter) {
    await finish("failed", { note: "keys_unavailable", error: "keys_unavailable" });
    return "retry";
  }

  try {
    const outcome = await handleEvent(adapter, row.providerEventId, row.id, now);

    // Two answers are "not yet", not "never": an event the provider's API does
    // not show yet (a delivery can beat its own read model), and one that
    // names nothing of ours yet (it can beat our commit). Both are kept and
    // retried for a while, then dropped.
    const age = now.getTime() - row.receivedAt.getTime();
    if (outcome.status === "ignored" && outcome.note === "not_found_at_provider" && age < EVENT_VISIBILITY_WINDOW_MS) {
      await finish("failed", { ...outcome, error: "event_not_visible_yet" });
      return "retry";
    }
    if (outcome.status === "ignored" && outcome.note === "no_matching_subscription" && age < UNMATCHED_WINDOW_MS) {
      await finish("failed", { ...outcome, error: "no_matching_subscription" });
      return "pending";
    }

    await finish(outcome.status, outcome);
    logSubscription("info", "webhook.done", {
      eventId: row.providerEventId,
      kind: outcome.kind,
      note: outcome.note,
      status: outcome.status,
    });
    return outcome.status;
  } catch (error) {
    const unavailable = error instanceof ProviderUnavailableError;
    await finish("failed", {
      note: unavailable ? "provider_unavailable" : "error",
      error: safeError(error),
    });
    // A provider outage is expected and retried; anything else is ours to fix.
    if (unavailable) {
      logSubscription("warn", "webhook.failed", { eventId: row.providerEventId, error: safeError(error) });
    } else {
      await alertOps("webhook_failed", { eventId: row.providerEventId, error: safeError(error), attempts: row.attempts });
    }
    return unavailable ? "retry" : "error";
  }
}

type Handled = {
  status: "processed" | "ignored";
  note: string;
  kind: EventKind;
  subscriptionId?: string | null;
};

async function handleEvent(
  adapter: SubscriptionProviderAdapter,
  providerEventId: string,
  rowId: string,
  now: Date
): Promise<Handled> {
  // The event as Culqi stored it — the only version we believe.
  const event = await adapter.getEvent(providerEventId);
  if (!event) return { status: "ignored", note: "not_found_at_provider", kind: "ignored" };

  const kind = classifyEvent(event.type);
  if (kind === "ignored") return { status: "ignored", note: `unhandled:${event.type}`.slice(0, 80), kind };

  const found = await findSubscriptionFor(event.data);
  if (found.kind === "none") return { status: "ignored", note: "no_matching_subscription", kind };

  // Several live subscriptions share the card (an upgrade in flight): the
  // event cannot be attributed by guessing. Each candidate reads its own
  // charges from the provider instead, which attributes them correctly.
  if (found.kind === "ambiguous") {
    for (const candidate of found.candidates) await reconcileSubscription(adapter, candidate.id, now);
    return { status: "processed", note: "ambiguous_card:reconciled", kind };
  }
  const sub = found.subscription;

  const ctx = { now, eventId: rowId };
  let outcome: LifecycleOutcome;

  if (kind === "subscription_changed") {
    const state = sub.providerSubscriptionId
      ? await adapter.getSubscription(sub.providerSubscriptionId)
      : normalizeSubscription(event.data);
    if (!state) return { status: "ignored", note: "subscription_missing_at_provider", kind, subscriptionId: sub.id };
    outcome = await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, sub.id);
      return locked
        ? applyProviderState(tx, locked, state, ctx)
        : { changed: false, cancelAtProvider: [], note: "gone" };
    });
  } else {
    const charge = chargeFacts(event.data);
    if (!charge) {
      // The event names no charge (the provider documents the family, not each
      // payload). Read the subscription and its charges from the provider.
      const note = await reconcileSubscription(adapter, sub.id, now);
      return { status: "processed", note: `no_charge_in_event:${note}`.slice(0, 80), kind, subscriptionId: sub.id };
    }
    // The next billing date comes from the subscription, not the event.
    const state =
      kind === "charge_succeeded" && sub.providerSubscriptionId
        ? await adapter.getSubscription(sub.providerSubscriptionId)
        : null;
    outcome = await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, sub.id);
      if (!locked) return { changed: false, cancelAtProvider: [], note: "gone" };
      if (kind === "charge_succeeded") return applyChargeSucceeded(tx, locked, charge, state, ctx);
      if (kind === "charge_failed") return applyChargeFailed(tx, locked, charge, ctx);
      return applyRefund(tx, locked, charge, ctx);
    });
  }

  await stopAtProvider(adapter, outcome.cancelAtProvider, now);
  if (outcome.review) await alertOps("review_needed", { subscriptionId: sub.id, reason: outcome.review });
  return { status: "processed", note: outcome.note, kind, subscriptionId: sub.id };
}

/**
 * Which of our subscriptions an event is about: by subscription id, then by
 * the checkout id we put in the metadata, then by a charge we already
 * recorded, then by the card it was charged to.
 */
type Found =
  | { kind: "one"; subscription: Subscription }
  | { kind: "ambiguous"; candidates: Subscription[] }
  | { kind: "none" };

async function findSubscriptionFor(data: Record<string, unknown>): Promise<Found> {
  const ids = collectIds(data);
  if (ids.subscriptions.length) {
    const bySub = await prisma.subscription.findFirst({
      where: { provider: "culqi", providerSubscriptionId: { in: ids.subscriptions } },
    });
    if (bySub) return { kind: "one", subscription: bySub };
  }

  const checkoutId = str(asRecord(data.metadata).checkout_id);
  if (checkoutId) {
    const checkout = await prisma.subscriptionCheckout.findUnique({
      where: { id: checkoutId },
      select: { subscriptionId: true },
    });
    if (checkout?.subscriptionId) {
      const byCheckout = await prisma.subscription.findUnique({ where: { id: checkout.subscriptionId } });
      if (byCheckout) return { kind: "one", subscription: byCheckout };
    }
  }

  // A refund names only the charge it reverses: find it through our payments.
  if (ids.charges.length) {
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { provider: "culqi", providerPaymentId: { in: ids.charges }, subscriptionId: { not: null } },
      select: { subscriptionId: true },
    });
    if (payment?.subscriptionId) {
      const byPayment = await prisma.subscription.findUnique({ where: { id: payment.subscriptionId } });
      if (byPayment) return { kind: "one", subscription: byPayment };
    }
  }

  // Last resort: the card. During an upgrade the old and the new subscription
  // share it, so more than one live candidate is reported, never guessed.
  if (ids.cards.length) {
    const byCard = await prisma.subscription.findMany({
      where: { provider: "culqi", providerCardId: { in: ids.cards }, endedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (byCard.length === 1) return { kind: "one", subscription: byCard[0] };
    if (byCard.length > 1) return { kind: "ambiguous", candidates: byCard };
    const ended = await prisma.subscription.findFirst({
      where: { provider: "culqi", providerCardId: { in: ids.cards } },
      orderBy: { createdAt: "desc" },
    });
    if (ended) return { kind: "one", subscription: ended };
  }
  return { kind: "none" };
}
