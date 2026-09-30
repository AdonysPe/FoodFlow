// The contract between the subscription backend and the dashboard.
//
// Safe to import from a client component: types, zod schemas and constants
// only — no Prisma, no env, no provider keys. The server actions that use it
// live in lib/actions/subscription.ts. Written up for the frontend in
// docs/SUSCRIPCIONES-CONTRATO.md (§10).

import { z } from "zod";
import { PLANS, type PlanValue } from "@/lib/plans";
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
};

// --------------------------------------------------------------- statuses

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
  subscription: {
    id: string;
    plan: PlanValue;
    status: BillingStatusValue;
    price: PriceSummary;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    card: { brand: string | null; last4: string | null };
  } | null;
  openCheckout: { id: string; status: CheckoutStatusValue; plan: PlanValue; expiresAt: string } | null;
  trial: { eligible: boolean; days: number };
  offers: PlanOffer[];
};
