export const CHANNEL_LABELS: Record<string, string> = {
  dine_in: "En salón",
  delivery: "Delivery",
  pickup: "Para llevar",
};

export const STATUS_FLOW = ["pending", "preparing", "ready", "delivered"] as const;
export type OrderStatusValue = (typeof STATUS_FLOW)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Entregada",
};

export function nextStatus(status: string): OrderStatusValue | null {
  const idx = STATUS_FLOW.indexOf(status as OrderStatusValue);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}
