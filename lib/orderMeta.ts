export const CHANNEL_LABELS: Record<string, string> = {
  dine_in: "Dine-in",
  delivery: "Delivery",
  pickup: "Pickup",
};

export const STATUS_FLOW = ["pending", "preparing", "ready", "delivered"] as const;
export type OrderStatusValue = (typeof STATUS_FLOW)[number];

export function nextStatus(status: string): OrderStatusValue | null {
  const idx = STATUS_FLOW.indexOf(status as OrderStatusValue);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}
