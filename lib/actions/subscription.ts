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
  type SubscriptionActor,
} from "@/lib/subscriptions/service";
import { logSubscription, safeError } from "@/lib/subscriptions/runtime";
import {
  cancelReactivation as cancelOwnedReactivation,
  cancelSubscription as cancelOwnedSubscription,
  changeSubscriptionPlan as changeOwnedPlan,
  previewPlanChange as previewOwnedPlanChange,
  reactivateSubscription as reactivateOwnedSubscription,
  startPaymentMethodUpdate as startOwnedPaymentMethodUpdate,
  updatePaymentMethod as updateOwnedPaymentMethod,
} from "@/lib/subscriptions/operations";
import {
  SUBSCRIPTION_ERROR_MESSAGES,
  type CancelReactivationInput,
  type CancelSubscriptionInput,
  type CancelSubscriptionOutput,
  type ChangePlanInput,
  type ChangePlanOutput,
  type PaymentMethodSessionInput,
  type PaymentMethodSessionOutput,
  type PlanChangePreview,
  type PreviewPlanChangeInput,
  type ReactivateSubscriptionInput,
  type UpdatePaymentMethodInput,
  type UpdatePaymentMethodOutput,
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
    logSubscription("error", `${name}.crashed`, { error: safeError(error) });
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

/**
 * Owner only. Stops the renewal at Culqi now; access continues until the end
 * of the period already paid (`data.accessUntil`).
 */
export async function cancelSubscription(
  input: CancelSubscriptionInput
): Promise<SubscriptionResult<CancelSubscriptionOutput>> {
  const result = await guarded("cancel", async () => cancelOwnedSubscription(await actor(), input));
  if (result.ok) revalidatePath("/dashboard/app", "layout");
  return result;
}

/** Owner only. What a plan change would do — changes nothing. */
export async function previewPlanChange(
  input: PreviewPlanChangeInput
): Promise<SubscriptionResult<PlanChangePreview>> {
  return guarded("plan.preview", async () => previewOwnedPlanChange(await actor(), input));
}

/**
 * Owner only. Upgrade → `{ kind: "checkout" }`: poll
 * `getSubscriptionCheckoutStatus` exactly as after a purchase; the new plan
 * opens when its first charge is confirmed. Downgrade → `{ kind: "scheduled" }`.
 */
export async function changeSubscriptionPlan(
  input: ChangePlanInput
): Promise<SubscriptionResult<ChangePlanOutput>> {
  const result = await guarded("plan.change", async () => changeOwnedPlan(await actor(), input));
  if (result.ok) revalidatePath("/dashboard/app/configuracion");
  return result;
}

/**
 * Owner only. Start paying again after cancelling (or after the access ended)
 * on the card already saved at Culqi — no card form.
 *  - paid days left  → `{ kind: "scheduled", effectiveAt }`: nothing is charged
 *    now, the days are kept, and Culqi is charged when they end.
 *  - no days left    → `{ kind: "checkout" }`: charged now; poll
 *    `getSubscriptionCheckoutStatus` as after a purchase.
 * Errors: not_reactivable (still active), no_payment_method,
 * subscriptions_disabled, change_pending, manual_subscription.
 */
export async function reactivateSubscription(
  input: ReactivateSubscriptionInput
): Promise<SubscriptionResult<ChangePlanOutput>> {
  const result = await guarded("reactivate", async () => reactivateOwnedSubscription(await actor(), input));
  if (result.ok) revalidatePath("/dashboard/app", "layout");
  return result;
}

/** Owner only. Drop a scheduled reactivation: the subscription just runs out. */
export async function cancelReactivation(
  input: CancelReactivationInput
): Promise<SubscriptionResult<{ accessUntil: string | null }>> {
  const result = await guarded("reactivate.cancel", async () => cancelOwnedReactivation(await actor(), input));
  if (result.ok) revalidatePath("/dashboard/app/configuracion");
  return result;
}

/**
 * Owner only. Step 1 of changing the card: the Culqi Checkout configuration
 * (same shape as a purchase's `next`) and the card currently on file.
 */
export async function startPaymentMethodUpdate(
  input: PaymentMethodSessionInput
): Promise<SubscriptionResult<PaymentMethodSessionOutput>> {
  return guarded("card.start", async () => startOwnedPaymentMethodUpdate(await actor(), input));
}

/**
 * Owner only. Step 2: the token Culqi Checkout returned (and, on the second
 * call, the 3DS result). `status: "updated"` means Culqi now charges the new
 * card; for a `past_due` subscription Culqi retries on its own schedule
 * (`willRetryCharge`), it does not charge at once.
 */
export async function updatePaymentMethod(
  input: UpdatePaymentMethodInput
): Promise<SubscriptionResult<UpdatePaymentMethodOutput>> {
  const result = await guarded("card.update", async () => updateOwnedPaymentMethod(await actor(), input));
  if (result.ok && result.data.status === "updated") revalidatePath("/dashboard/app/configuracion");
  return result;
}
