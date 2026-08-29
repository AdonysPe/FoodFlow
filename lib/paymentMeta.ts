// Payment methods for the comanda cobro flow. Shared by server actions and
// the mobile payment sheet.

export const PAYMENT_METHODS = ["efectivo", "tarjeta", "yape"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  yape: "Yape",
};

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
