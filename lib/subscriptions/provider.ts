// What the subscription service needs from a payment provider. The service
// only ever talks to this interface; lib/subscriptions/culqi.ts implements it.
//
// Server only.

export type ProviderCustomerInput = {
  email: string;
  firstName: string;
  lastName: string;
  /** 9-digit Peru mobile. */
  phone: string;
  address: string;
  city: string;
  metadata: Record<string, string>;
};

export type Authentication3DS = {
  eci?: string;
  xid?: string;
  cavv?: string;
  protocolVersion?: string;
  directoryServerTransactionId?: string;
};

export type SaveCardResult =
  | { kind: "saved"; cardId: string; brand: string | null; last4: string | null }
  /** The issuer asked for 3-D Secure; nothing was saved. */
  | { kind: "requires_3ds" }
  /** Refused by the issuer or by the provider's antifraud. */
  | { kind: "declined"; code: string | null; userMessage: string | null };

export type PlanCheck = {
  amountCents: number;
  currency: string;
  /** Whether the plan starts with free cycles, when the provider says so. */
  hasFreeInitialCycles: boolean | null;
};

/** An event as the provider's own API returns it — never the webhook body. */
export type ProviderEvent = {
  id: string;
  type: string;
  createdAt: Date | null;
  data: Record<string, unknown>;
};

/**
 * A subscription as the provider reports it, reduced to what the lifecycle
 * needs. `status: "unknown"` means the provider said something we do not map;
 * the lifecycle then changes nothing.
 */
export type ProviderSubscriptionState = {
  id: string;
  status: "active" | "canceled" | "unknown";
  cardId: string | null;
  planId: string | null;
  trialEndsAt: Date | null;
  nextBillingAt: Date | null;
  createdAt: Date | null;
};

/**
 * A call whose outcome is unknown (timeout, 5xx, dropped connection). The
 * provider may or may not have acted, so the caller must not retry blindly.
 */
export class ProviderUnavailableError extends Error {
  constructor(message: string, readonly operation: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

/** The provider answered and refused the request (4xx that is not a card decline). */
export class ProviderRejectedError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly status: number,
    readonly providerCode: string | null
  ) {
    super(message);
    this.name = "ProviderRejectedError";
  }
}

export interface SubscriptionProviderAdapter {
  readonly id: "culqi";
  getPlan(planId: string): Promise<PlanCheck>;
  /** Creates the customer, or returns the one that already has this email. */
  ensureCustomer(input: ProviderCustomerInput): Promise<{ customerId: string }>;
  saveCard(input: {
    customerId: string;
    tokenId: string;
    authentication3DS?: Authentication3DS;
    metadata: Record<string, string>;
  }): Promise<SaveCardResult>;
  createSubscription(input: {
    cardId: string;
    planId: string;
    metadata: Record<string, string>;
  }): Promise<{ subscriptionId: string; rawStatus: string | null }>;
  /** The event as stored by the provider, or null if it does not exist there. */
  getEvent(eventId: string): Promise<ProviderEvent | null>;
  /** Null when the provider has no such subscription. */
  getSubscription(subscriptionId: string): Promise<ProviderSubscriptionState | null>;
  /** Stops future charges. Idempotent: an already cancelled one is fine. */
  cancelSubscription(subscriptionId: string): Promise<"canceled" | "already_canceled">;
  /**
   * For a creation whose response was lost: the subscription on this card and
   * plan created at or after `createdAfter`, if the provider has one.
   */
  findSubscription(input: {
    planId: string;
    cardId: string;
    createdAfter: Date;
  }): Promise<ProviderSubscriptionState | null>;
}
