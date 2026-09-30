// Shared plumbing for the subscription modules: the secret-free logger, the
// provider adapter (with a seam for tests) and the result helper.
//
// Server only.

import { createCulqiAdapter } from "@/lib/subscriptions/culqi";
import { readCulqiKeys } from "@/lib/subscriptions/config";
import type { SubscriptionProviderAdapter } from "@/lib/subscriptions/provider";
import {
  SUBSCRIPTION_ERROR_MESSAGES,
  type SubscriptionErrorCode,
  type SubscriptionResult,
} from "@/lib/subscriptions/contract";

/**
 * Structured log line. NEVER pass a token, a key, a card detail, an email or
 * a raw provider payload — ids, codes and counts only.
 */
export function logSubscription(
  level: "info" | "warn" | "error",
  event: string,
  data: Record<string, unknown> = {}
) {
  console[level](JSON.stringify({ scope: "subscriptions", event, ...data }));
}

export function fail<T>(code: SubscriptionErrorCode, error?: string): SubscriptionResult<T> {
  return { ok: false, code, error: error ?? SUBSCRIPTION_ERROR_MESSAGES[code] };
}

type Factory = (keys: { secretKey: string }) => SubscriptionProviderAdapter;

const defaultFactory: Factory = (keys) => createCulqiAdapter(keys.secretKey);
let factory: Factory = defaultFactory;
const resetHooks: Array<() => void> = [];

export function adapterFor(keys: { secretKey: string }): SubscriptionProviderAdapter {
  return factory(keys);
}

/** Register state (caches) a test reset must clear. */
export function onAdapterReset(hook: () => void) {
  resetHooks.push(hook);
}

export function setAdapterFactoryForTests(next: Factory | null) {
  factory = next ?? defaultFactory;
  for (const hook of resetHooks) hook();
}

/**
 * The adapter for background work (webhooks, renewals, cancellations), which
 * must keep running when new checkouts are switched off. Null when the keys
 * are missing or unsafe — the caller then leaves everything as it is.
 */
export function lifecycleAdapter(): SubscriptionProviderAdapter | null {
  const keys = readCulqiKeys();
  if (keys.ok) return adapterFor(keys.keys);
  if (keys.reason === "misconfigured") {
    logSubscription("error", "keys.invalid", { problems: keys.problems });
  }
  return null;
}
