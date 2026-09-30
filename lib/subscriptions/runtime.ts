// Shared plumbing for the subscription modules: the secret-free logger, the
// provider adapter (with a seam for tests) and the result helper.
//
// Server only.

import { Prisma } from "@prisma/client";
import { createCulqiAdapter } from "@/lib/subscriptions/culqi";
import { readCulqiKeys } from "@/lib/subscriptions/config";
import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
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

/**
 * An error reduced to what is safe to write down. NEVER log `String(error)`:
 * a Prisma error message embeds the whole invocation, arguments included —
 * here that is the payer's name, phone and address — and a provider error can
 * echo a request. Only the error's kind, and for our own provider errors the
 * operation and HTTP status, survive.
 */
export function safeError(error: unknown): string {
  if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
    return `${error.name}:${error.message}`.slice(0, 160);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `PrismaError:${error.code}`;
  if (error instanceof Prisma.PrismaClientInitializationError) return "PrismaInitializationError";
  if (error instanceof Error) return error.name.slice(0, 60);
  return typeof error;
}

/**
 * Events that need a person. Written as an error-level log line with a stable
 * `alert.*` name (filter on it in the log drain) and, when
 * ERROR_LOG_WEBHOOK_URL is set, posted there too. Best-effort and bounded:
 * an alert that fails must never fail the payment path that raised it. `data`
 * carries ids and codes only.
 */
export async function alertOps(event: string, data: Record<string, unknown> = {}): Promise<void> {
  const name = event.startsWith("alert.") ? event : `alert.${event}`;
  logSubscription("error", name, data);
  const url = process.env.ERROR_LOG_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "foodflow.subscriptions",
        timestamp: new Date().toISOString(),
        event: name,
        environment: process.env.VERCEL_ENV ?? "local",
        data,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Already in the log above.
  }
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
