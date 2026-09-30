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
}
