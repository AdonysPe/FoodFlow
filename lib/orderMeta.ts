export const CHANNEL_LABELS: Record<string, string> = {
  dine_in: "En salón",
  delivery: "Delivery",
  pickup: "Para llevar",
};

export function orderOriginLabel(source: string | null | undefined, channel: string) {
  if (source === "online_store") return channel === "delivery" ? "WEB · DELIVERY" : "WEB · RECOJO";
  return channel === "dine_in" ? "Mesa" : CHANNEL_LABELS[channel];
}

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

/**
 * Where to send whoever is taking the order out. Coordinates win when the
 * diner dropped a pin; otherwise the typed address still opens a search, so
 * an order placed while Maps was down is not a dead end for the rider.
 */
export function deliveryMapLink(order: {
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  fulfillmentAddress?: string | null;
  deliveryZone?: string | null;
}): string | null {
  const { deliveryLatitude: lat, deliveryLongitude: lng } = order;
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const query = [order.fulfillmentAddress, order.deliveryZone, "Perú"].filter(Boolean).join(", ");
  return order.fulfillmentAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
