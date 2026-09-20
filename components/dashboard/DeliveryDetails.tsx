import { deliveryMapLink } from "@/lib/orderMeta";
import { PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/paymentMeta";

/**
 * Everything the kitchen and the till need to get an online order to a door:
 * who to call, where to go, and how to open it on a map. Shared so the board
 * and the orders table can never drift into showing different things.
 */
export type DeliveryDetailsOrder = {
  customerPhone: string | null;
  fulfillmentAddress: string | null;
  deliveryZone: string | null;
  deliveryReference: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerNotes: string | null;
  paymentMethod?: PaymentMethodValue | null;
};

export default function DeliveryDetails({ order, className = "", highlightNotes = false }: {
  order: DeliveryDetailsOrder;
  className?: string;
  highlightNotes?: boolean;
}) {
  const map = deliveryMapLink(order);
  return <div className={`text-xs leading-relaxed text-muted ${className}`}>
    <p>{order.customerPhone}</p>
    <p>{order.fulfillmentAddress}{order.deliveryZone ? ` · ${order.deliveryZone}` : ""}</p>
    {order.deliveryReference && <p>Referencia: {order.deliveryReference}</p>}
    {map && <a href={map} target="_blank" rel="noreferrer" className="inline-block underline underline-offset-2">Abrir en Google Maps</a>}
    {order.customerNotes && <p className={highlightNotes ? "font-semibold text-accent-ink" : ""}>{order.customerNotes}</p>}
    {order.paymentMethod && <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>}
  </div>;
}
