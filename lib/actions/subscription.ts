"use server";

// FoodFlow's own subscriptions — the actions the dashboard calls. Thin on
// purpose: resolve the session, hand over to lib/subscriptions/service.ts,
// and turn an unexpected failure into a result instead of a crash page in the
// middle of a payment. Contract: lib/subscriptions/contract.ts.

import { revalidatePath } from "next/cache";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import {
  confirmCheckout,
  createCheckout,
  getCheckoutStatus,
  getSubscriptionView,
  logSubscription,
  type SubscriptionActor,
} from "@/lib/subscriptions/service";
import {
  SUBSCRIPTION_ERROR_MESSAGES,
  type CheckoutStatusOutput,
  type ConfirmCheckoutInput,
  type ConfirmCheckoutOutput,
  type CreateCheckoutInput,
  type CreateCheckoutOutput,
  type SubscriptionResult,
  type SubscriptionView,
} from "@/lib/subscriptions/contract";

async function actor(): Promise<SubscriptionActor> {
  // Redirects to /login without a valid venue-manager session.
  const { user, restaurant, isOwner } = await requireClientRestaurant();
  return { user, restaurant, isOwner };
}

async function guarded<T>(
  name: string,
  run: () => Promise<SubscriptionResult<T>>
): Promise<SubscriptionResult<T>> {
  try {
    return await run();
  } catch (error) {
    // Next's redirect() throws on purpose; let it through.
    if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_")) {
      throw error;
    }
    logSubscription("error", `${name}.crashed`, { error: String(error) });
    return { ok: false, code: "internal", error: SUBSCRIPTION_ERROR_MESSAGES.internal };
  }
}

/** Owner only. Opens (or, with the same idempotency key, returns) a purchase attempt. */
export async function createSubscriptionCheckout(
  input: CreateCheckoutInput
): Promise<SubscriptionResult<CreateCheckoutOutput>> {
  return guarded("checkout.create", async () => createCheckout(await actor(), input));
}

/**
 * Owner only. Sends the Culqi card token (and, on the second call, the 3DS
 * result). Ends in `processing` — never in an active plan: activation is the
 * server's, after Culqi confirms.
 */
export async function confirmSubscriptionCheckout(
  input: ConfirmCheckoutInput
): Promise<SubscriptionResult<ConfirmCheckoutOutput>> {
  const result = await guarded("checkout.confirm", async () => confirmCheckout(await actor(), input));
  if (result.ok) revalidatePath("/dashboard/app/configuracion");
  return result;
}

/** Owner or manager. Read-only; safe to poll every few seconds. */
export async function getSubscriptionCheckoutStatus(
  checkoutId: string
): Promise<SubscriptionResult<CheckoutStatusOutput>> {
  return guarded("checkout.status", async () => getCheckoutStatus(await actor(), checkoutId));
}

/** Owner or manager. Everything the "Plan y cobro" screen needs. */
export async function getSubscriptionStatus(): Promise<SubscriptionResult<SubscriptionView>> {
  return guarded("status", async () => getSubscriptionView(await actor()));
}
