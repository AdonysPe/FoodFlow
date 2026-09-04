// Payment methods for the comanda cobro flow. Shared by server actions, the
// mobile payment sheet and the orders table.

// What the till offers today. `tarjeta` is missing on purpose: it is the
// pre-split value kept only so older orders still read back (see LEGACY below).
export const PAYMENT_METHODS = [
  "efectivo",
  "tarjeta_credito",
  "tarjeta_debito",
  "yape",
  "transferencia",
  "mixto",
] as const;

/** What the till can pick today. Excludes the legacy value on purpose. */
export type ActivePaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Anything that can come back off an order, legacy value included. */
export type PaymentMethodValue = ActivePaymentMethod | typeof LEGACY_CARD;

/** Charges taken before credit and debit were told apart. */
export const LEGACY_CARD = "tarjeta";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  tarjeta_credito: "T. Crédito",
  tarjeta_debito: "T. Débito",
  yape: "Yape / Plin",
  transferencia: "Transferencia",
  mixto: "Mixto",
};

/** The unabbreviated name, for the dropdown and the printed ticket. */
export const PAYMENT_METHOD_LONG_LABELS: Record<PaymentMethodValue, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  tarjeta_credito: "Tarjeta de crédito",
  tarjeta_debito: "Tarjeta de débito",
  yape: "Yape / Plin",
  transferencia: "Transferencia",
  mixto: "Pago mixto",
};

/** Only cash asks what was handed over and gives change back. */
export function needsTenderedAmount(method: PaymentMethodValue | null): boolean {
  return method === "efectivo";
}

/**
 * A mixed payment asks for the cash half instead: the rest goes on a card or
 * a wallet, so there is no vuelto to compute and asking for one would be wrong.
 */
export function needsCashSplit(method: PaymentMethodValue | null): boolean {
  return method === "mixto";
}

// Rounded-up suggestions the waiter can tap instead of typing the exact
// tendered amount (cash only). The exact total is always offered first.
export function cashQuickAmounts(total: number): number[] {
  const out = new Set<number>();
  out.add(Math.ceil(total)); // exact (rounded to the sol)
  for (const step of [10, 20, 50, 100, 200]) {
    const up = Math.ceil(total / step) * step;
    if (up > total) out.add(up);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}
