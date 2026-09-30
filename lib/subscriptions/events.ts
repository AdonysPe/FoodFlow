// Reading provider objects without trusting their shape.
//
// Culqi documents its event families (charges, refunds, subscriptions…) but
// not an exhaustive schema per event, and its own SDKs disagree on details
// such as whether dates are seconds or milliseconds. So everything here is
// defensive: ids are found by their prefix wherever they sit in the object,
// dates accept seconds, milliseconds or ISO strings, and anything we cannot
// read becomes null or "ignored" — never a guess that moves money or access.
//
// Pure: no I/O. Server and tests only.

import type { ProviderSubscriptionState } from "@/lib/subscriptions/provider";

export type Json = Record<string, unknown>;

export function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Epoch seconds, epoch milliseconds or an ISO string → Date. */
export function providerDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  if (typeof value === "string" && value.length > 0) {
    if (/^\d+$/.test(value)) return providerDate(Number(value));
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

const ID_PATTERN = /^(sxn|crd|chr|cus|ref|evt|pln)_(test|live)_[A-Za-z0-9]+$/;

export type ProviderIds = {
  subscriptions: string[];
  cards: string[];
  charges: string[];
  customers: string[];
};

/** Every provider id in the object, by kind, however deeply nested. */
export function collectIds(value: unknown, depth = 0): ProviderIds {
  const ids: ProviderIds = { subscriptions: [], cards: [], charges: [], customers: [] };
  const seen = new Set<string>();
  const walk = (node: unknown, level: number) => {
    if (level > 8 || node == null) return;
    if (typeof node === "string") {
      if (!ID_PATTERN.test(node) || seen.has(node)) return;
      seen.add(node);
      if (node.startsWith("sxn_")) ids.subscriptions.push(node);
      else if (node.startsWith("crd_")) ids.cards.push(node);
      else if (node.startsWith("chr_")) ids.charges.push(node);
      else if (node.startsWith("cus_")) ids.customers.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node.slice(0, 50)) walk(item, level + 1);
      return;
    }
    if (typeof node === "object") {
      for (const child of Object.values(node as Json)) walk(child, level + 1);
    }
  };
  walk(value, depth);
  return ids;
}

export type EventKind =
  | "charge_succeeded"
  | "charge_failed"
  | "refund"
  | "subscription_changed"
  | "ignored";

/**
 * What an event means for a subscription. Failure words are checked before
 * success words: "charge.creation.failed" contains "creation" too.
 */
export function classifyEvent(type: string): EventKind {
  const t = type.toLowerCase();
  if (/refund|devoluc/.test(t)) return "refund";
  if (/charge|cargo/.test(t)) {
    if (/fail|declin|rechaz|denied|error/.test(t)) return "charge_failed";
    if (/succeed|exitos|paid|creat/.test(t)) return "charge_succeeded";
    return "ignored";
  }
  if (/subscri|suscrip/.test(t)) return "subscription_changed";
  return "ignored";
}

export type ChargeOutcome = "succeeded" | "failed" | "unknown";

/**
 * Whether a charge object (read from the provider's API) went through.
 * Anything not clearly one or the other is "unknown" and is never applied.
 */
export function chargeOutcome(raw: Json): ChargeOutcome {
  const type = (str(asRecord(raw.outcome).type) ?? "").toLowerCase();
  if (/exitos|success|paid|approved/.test(type)) return "succeeded";
  if (/rechaz|fail|denied|declin|error/.test(type)) return "failed";
  if (raw.paid === true) return "succeeded";
  return "unknown";
}

export type ChargeFacts = {
  /** The provider charge id — the idempotency key for payments. */
  chargeId: string;
  amountCents: number | null;
  currency: string | null;
  occurredAt: Date | null;
  failureCode: string | null;
};

/** The charge an event is about, or null if it names none. */
export function chargeFacts(data: Json): ChargeFacts | null {
  const ownId = str(data.id);
  const chargeId =
    ownId?.startsWith("chr_") ? ownId : (str(data.charge_id) ?? collectIds(data).charges[0] ?? null);
  if (!chargeId) return null;
  const outcome = asRecord(data.outcome);
  const amount = data.amount;
  return {
    chargeId,
    amountCents: typeof amount === "number" && Number.isInteger(amount) ? amount : null,
    currency: str(data.currency_code) ?? str(data.currency),
    occurredAt: providerDate(data.creation_date) ?? providerDate(data.created_at),
    failureCode:
      str(outcome.code) ?? str(data.decline_code) ?? str(data.code) ?? str(outcome.type) ?? null,
  };
}

/**
 * Culqi documents two subscription states, active and canceled. Numeric
 * codes are accepted only for "1" (active), pending confirmation in sandbox;
 * any other value is "unknown" and changes nothing.
 */
function subscriptionStatus(raw: Json): ProviderSubscriptionState["status"] {
  if (raw.deleted === true) return "canceled";
  const status = raw.status;
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (/cancel|delet|inactiv|finaliz/.test(s)) return "canceled";
    if (/activ/.test(s)) return "active";
    if (s === "1") return "active";
    return "unknown";
  }
  if (status === 1) return "active";
  return "unknown";
}

export function normalizeSubscription(raw: Json): ProviderSubscriptionState | null {
  const id = str(raw.id);
  if (!id?.startsWith("sxn_")) return null;
  const plan = asRecord(raw.plan);
  const card = asRecord(raw.active_card);
  return {
    id,
    status: subscriptionStatus(raw),
    cardId:
      str(raw.card_id) ?? str(raw.active_card) ?? str(card.id) ?? collectIds(raw).cards[0] ?? null,
    planId: str(raw.plan_id) ?? str(plan.id) ?? str(plan.plan_id),
    trialEndsAt: providerDate(raw.trial_end),
    nextBillingAt: providerDate(raw.next_billing_date),
    createdAt: providerDate(raw.creation_date),
    // Whatever charges the subscription object lists. Each one is fetched and
    // verified on its own before it moves anything (lib/subscriptions/reconcile.ts).
    chargeIds: collectIds(raw).charges.slice(0, 24),
  };
}
