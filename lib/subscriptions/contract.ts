// The contract between the subscription backend and the dashboard.
//
// Safe to import from a client component: types, zod schemas and constants
// only — no Prisma, no env, no provider keys. The server actions that use it
// live in lib/actions/subscription.ts. Written up for the frontend in
// docs/SUSCRIPCIONES-CONTRATO.md (§10).

import { z } from "zod";
import { PLANS, type FeatureValue, type PlanValue } from "@/lib/plans";
import type { PriceSummary } from "@/lib/subscriptions/pricing";
import type {
  AccessMode,
  BillingSourceValue,
  BillingStatusValue,
  EntitlementReason,
} from "@/lib/subscriptions/entitlement";

export type { PriceSummary } from "@/lib/subscriptions/pricing";

// ------------------------------------------------------------------ results

export const SUBSCRIPTION_ERROR_CODES = [
  "forbidden_not_owner",
  "restaurant_mismatch",
  "invalid_input",
  "idempotency_conflict",
  "subscriptions_disabled",
  "provider_misconfigured",
  "provider_unavailable",
  "already_subscribed",
  "checkout_in_progress",
  "checkout_not_found",
  "checkout_expired",
  "checkout_closed",
  "card_declined",
  "rate_limited",
  "internal",
  // Fase 3: cancel and plan change.
  "no_active_subscription",
  "already_canceled",
  "manual_subscription",
  "same_plan",
  "change_pending",
  "downgrade_blocked",
] as const;
export type SubscriptionErrorCode = (typeof SUBSCRIPTION_ERROR_CODES)[number];

/**
 * `error` is Spanish and safe to show as is. `code` is what the UI branches
 * on. A missing or expired session never reaches this: the guard redirects to
 * /login, as everywhere else in the dashboard.
 */
export type SubscriptionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: SubscriptionErrorCode; error: string };

export const SUBSCRIPTION_ERROR_MESSAGES: Record<SubscriptionErrorCode, string> = {
  forbidden_not_owner: "Solo el dueño del restaurante puede contratar o cambiar el plan.",
  restaurant_mismatch:
    "El restaurante activo cambió. Recarga la página y vuelve a intentarlo.",
  invalid_input: "Revisa los datos del formulario.",
  idempotency_conflict: "Esta solicitud ya se usó con otros datos. Recarga la página.",
  subscriptions_disabled:
    "El pago con tarjeta todavía no está disponible. Escríbenos por WhatsApp para activar tu plan.",
  provider_misconfigured:
    "El pago con tarjeta no está disponible en este momento. Ya estamos revisándolo.",
  provider_unavailable: "No pudimos comunicarnos con la pasarela de pago. Inténtalo en unos minutos.",
  already_subscribed: "Este restaurante ya tiene una suscripción activa.",
  checkout_in_progress:
    "Ya hay un pago en proceso para este restaurante. Espera unos segundos y revisa el estado.",
  checkout_not_found: "No encontramos ese intento de pago.",
  checkout_expired: "El intento de pago venció. Vuelve a elegir tu plan.",
  checkout_closed: "Este intento de pago ya terminó. Vuelve a elegir tu plan.",
  card_declined: "La tarjeta fue rechazada. Prueba con otra tarjeta.",
  rate_limited: "Demasiados intentos. Espera unos minutos.",
  internal: "Algo salió mal de nuestro lado. Inténtalo de nuevo.",
  no_active_subscription: "Este restaurante no tiene una suscripción con tarjeta activa.",
  already_canceled: "La suscripción ya está cancelada. Seguirás con acceso hasta el fin del período pagado.",
  manual_subscription:
    "Tu plan lo gestiona el equipo de FoodFlow. Escríbenos por WhatsApp para cambiarlo o cancelarlo.",
  same_plan: "Ya estás en ese plan.",
  change_pending: "Ya hay un cambio de plan en curso para este restaurante.",
  downgrade_blocked:
    "Tienes más usuarios de los que permite ese plan. Quita mozos en Equipo antes de bajar de plan.",
};

// --------------------------------------------------------------- statuses

export const CHECKOUT_PURPOSES = ["new", "upgrade", "downgrade"] as const;
export type CheckoutPurposeValue = (typeof CHECKOUT_PURPOSES)[number];

/**
 * `failureCode` values a checkout can end with:
 * - card_declined         the card (or its first charge) was refused
 * - canceled_at_provider  the provider cancelled it before it activated
 * - not_created           the provider never created it (lost response)
 * - unknown_outcome       still `processing`: the server is confirming
 */
export const CHECKOUT_FAILURE_CODES = [
  "card_declined",
  "canceled_at_provider",
  "not_created",
  "unknown_outcome",
] as const;

export const CHECKOUT_STATUSES = [
  "created",
  "requires_action",
  "processing",
  "completed",
  "failed",
  "expired",
  "canceled",
] as const;
export type CheckoutStatusValue = (typeof CHECKOUT_STATUSES)[number];

// ------------------------------------------------------------ return paths

export const DEFAULT_RETURN_PATH = "/dashboard/app/configuracion";

/**
 * A return path the server will send the browser to — and the only kind it
 * accepts. A dashboard path, nothing else: no scheme, no host, no `//`, no
 * backslash, no dot segments, no query. Anything that fails falls back to the
 * default instead of erroring, so a stale link never blocks a purchase.
 */
export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_RETURN_PATH;
  const path = raw.trim();
  if (path.length === 0 || path.length > 120) return DEFAULT_RETURN_PATH;
  if (!/^\/dashboard\/app(\/[a-z0-9-]+)*$/.test(path)) return DEFAULT_RETURN_PATH;
  return path;
}

// ------------------------------------------------------------------ inputs

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Peru mobile, stored as 9 digits without the country code. */
const peruMobile = z
  .string()
  .transform((raw) => {
    const digits = raw.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
  })
  .refine((digits) => /^9\d{8}$/.test(digits), "Ingresa un celular peruano de 9 dígitos.");

export const checkoutCustomerSchema = z
  .object({
    firstName: text(2, 50),
    lastName: text(2, 50),
    phone: peruMobile,
    address: text(5, 100),
    city: text(2, 30),
  })
  .strict();

export const billingDocumentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("boleta") }).strict(),
  z
    .object({
      type: z.literal("factura"),
      ruc: z.string().regex(/^(10|15|16|17|20)\d{9}$/, "RUC no válido."),
      legalName: text(3, 120),
    })
    .strict(),
]);

export const createCheckoutInputSchema = z
  .object({
    /** Must be the restaurant active in the session; checked on the server. */
    restaurantId: z.string().cuid(),
    plan: z.enum(PLANS),
    /** A fresh `crypto.randomUUID()` per purchase attempt, reused on retry. */
    idempotencyKey: z.string().uuid(),
    acceptTerms: z.literal(true),
    customer: checkoutCustomerSchema,
    billingDocument: billingDocumentSchema,
    /** Where to land afterwards. Validated with `safeReturnPath`. */
    returnPath: z.string().max(200).optional(),
  })
  .strict();
export type CreateCheckoutInput = z.input<typeof createCheckoutInputSchema>;

/** What Culqi3DS hands back in `parameters3DS`, forwarded untouched. */
export const authentication3DSSchema = z
  .object({
    eci: z.string().max(100).optional(),
    xid: z.string().max(200).optional(),
    cavv: z.string().max(200).optional(),
    protocolVersion: z.string().max(20).optional(),
    directoryServerTransactionId: z.string().max(200).optional(),
  })
  .strict();

export const confirmCheckoutInputSchema = z
  .object({
    checkoutId: z.string().cuid(),
    /** `Culqi.token.id` from Culqi Checkout. Single use, never a card number. */
    tokenId: z.string().regex(/^tkn_(test|live)_[A-Za-z0-9]{8,64}$/, "Token no válido."),
    /** Only on the second call, after Culqi3DS finished. */
    authentication3DS: authentication3DSSchema.optional(),
  })
  .strict();
export type ConfirmCheckoutInput = z.input<typeof confirmCheckoutInputSchema>;

export const CANCEL_REASONS = ["price", "not_using", "missing_feature", "closing", "other"] as const;

export const cancelSubscriptionInputSchema = z
  .object({
    restaurantId: z.string().cuid(),
    confirm: z.literal(true),
    reason: z.enum(CANCEL_REASONS).optional(),
  })
  .strict();
export type CancelSubscriptionInput = z.input<typeof cancelSubscriptionInputSchema>;

export const previewPlanChangeInputSchema = z
  .object({
    restaurantId: z.string().cuid(),
    targetPlan: z.enum(PLANS),
  })
  .strict();
export type PreviewPlanChangeInput = z.input<typeof previewPlanChangeInputSchema>;

export const changePlanInputSchema = z
  .object({
    restaurantId: z.string().cuid(),
    targetPlan: z.enum(PLANS),
    /** A fresh `crypto.randomUUID()` per change, reused on retry. */
    idempotencyKey: z.string().uuid(),
    /** The owner saw the preview and accepts it. */
    confirm: z.literal(true),
  })
  .strict();
export type ChangePlanInput = z.input<typeof changePlanInputSchema>;

// ----------------------------------------------------------------- outputs

/**
 * How to collect the card. Culqi has no redirect-style hosted page for
 * subscriptions, so the card is typed into Culqi Checkout v4 — Culqi's own
 * iframe, loaded from checkout.culqi.com — and never reaches our server.
 */
export type CheckoutNext = {
  type: "culqi_checkout";
  /** Culqi public key (pk_test_… / pk_live_…). Public by design. */
  publicKey: string;
  settings: {
    title: string;
    currency: "PEN";
    /** Céntimos. What the card will be charged per month, IGV included. */
    amount: number;
  };
  /** Only cards: subscriptions renew on a saved card. */
  paymentMethods: { tarjeta: true };
  /** Absolute URL for Culqi3DS `settings.charge.returnUrl`. */
  threeDSReturnUrl: string;
};

export type CreateCheckoutOutput = {
  checkoutId: string;
  status: CheckoutStatusValue;
  plan: PlanValue;
  price: PriceSummary;
  /** 0 when the restaurant already used its free trial. */
  trialDays: number;
  expiresAt: string;
  next: CheckoutNext;
};

export type ConfirmCheckoutOutput =
  | {
      /** The bank wants 3-D Secure. Run Culqi3DS, then confirm again. */
      status: "requires_action";
      checkoutId: string;
      threeDS: {
        /** Culqi3DS `settings.card.email`. */
        email: string;
        /** Culqi3DS `settings.charge.totalAmount`, céntimos. */
        totalAmount: number;
        returnUrl: string;
      };
    }
  | {
      /**
       * The subscription exists at Culqi. Activation happens on the server
       * when Culqi confirms it — poll `getCheckoutStatus`, never assume.
       */
      status: "processing";
      checkoutId: string;
    }
  | { status: "completed"; checkoutId: string };

export type CheckoutStatusOutput = {
  checkoutId: string;
  status: CheckoutStatusValue;
  /**
   * Fase 3. "new" for a first purchase; plan changes poll the same way.
   * Always sent by the server; optional in the type only so UI code that
   * builds a provisional status locally keeps compiling.
   */
  purpose?: CheckoutPurposeValue;
  plan: PlanValue;
  trialDays: number;
  /** Machine code of the last failure, e.g. "card_declined". */
  failureCode: string | null;
  returnPath: string;
  expiresAt: string;
};

export type PlanOffer = {
  plan: PlanValue;
  price: PriceSummary;
  /** Trial this restaurant would get if it bought this plan now. */
  trialDays: number;
};

export type SubscriptionView = {
  restaurantId: string;
  /** True only for the owner: the only role that can buy, change or cancel. */
  canManage: boolean;
  /** False while card payments are switched off (then: WhatsApp). */
  checkoutEnabled: boolean;
  source: BillingSourceValue;
  plan: PlanValue;
  status: BillingStatusValue;
  access: {
    mode: AccessMode;
    effectivePlan: PlanValue | null;
    reason: EntitlementReason;
    until: string | null;
  };
  /**
   * The subscription that decides the plan now (activated, not ended); if
   * there is none, the most recent one.
   */
  subscription: {
    id: string;
    plan: PlanValue;
    status: BillingStatusValue;
    price: PriceSummary;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    card: { brand: string | null; last4: string | null };
    // Fase 3 ----------------------------------------------------------------
    /** Null until the provider confirmed it (trial started or first payment). */
    activatedAt: string | null;
    /** Until when this subscription pays for access. */
    accessUntil: string | null;
    canceledAt: string | null;
    /** A scheduled downgrade. */
    pendingChange: { plan: PlanValue; effectiveAt: string } | null;
    lastPayment: {
      status: "succeeded" | "failed" | "refunded";
      grossCents: number;
      at: string;
      failureCode: string | null;
    } | null;
  } | null;
  /** Fase 3. What the owner can do right now (always false for managers). */
  actions: { canCancel: boolean; canChangePlan: boolean };
  openCheckout: { id: string; status: CheckoutStatusValue; plan: PlanValue; expiresAt: string } | null;
  trial: { eligible: boolean; days: number };
  offers: PlanOffer[];
};

// ------------------------------------------------------ Fase 3 outputs

export type CancelSubscriptionOutput = {
  status: BillingStatusValue;
  cancelAtPeriodEnd: true;
  /** Access continues until then; null if it already ended. */
  accessUntil: string | null;
};

export type PlanChangePreview = {
  currentPlan: PlanValue;
  targetPlan: PlanValue;
  direction: "upgrade" | "downgrade";
  /** Upgrade: once the first charge of the new plan is confirmed. Downgrade: end of the paid period. */
  effectiveAt: string;
  /** What is charged right away (upgrade only; no proration in v1). */
  chargeNow: PriceSummary | null;
  newPrice: PriceSummary;
  /** Upgrading during the free trial ends it and charges the new plan. */
  endsTrial: boolean;
  /** Downgrades stop the current renewal at the provider; they cannot be undone. */
  irreversible: boolean;
  losesFeatures: FeatureValue[];
  blockers: { code: "staff_over_limit"; current: number; max: number }[];
};

export type ChangePlanOutput =
  | {
      /** Poll `getSubscriptionCheckoutStatus(checkoutId)`, as for a purchase. */
      kind: "checkout";
      checkoutId: string;
      status: CheckoutStatusValue;
    }
  | { kind: "scheduled"; effectiveAt: string };
