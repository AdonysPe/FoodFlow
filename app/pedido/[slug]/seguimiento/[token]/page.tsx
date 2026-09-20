import { notFound } from "next/navigation";
import { readOnlineOrder } from "@/lib/db/orderingWebsite";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderMeta";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import { whatsappLink } from "@/lib/carta";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import type { OrderItemInput } from "@/lib/actions/orders";
export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function TrackingPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const order = await readOnlineOrder(token, slug);
  if (!order) notFound();
  const contact = whatsappLink(order.whatsapp, `Consulta sobre mi pedido ${order.code}`);
  return <main id="main" className="mx-auto max-w-xl px-5 py-12">
    <AutoRefresh intervalMs={8000} />
    <h1 className="font-display text-3xl font-bold">{order.voided ? "Pedido anulado" : "¡Pedido recibido!"}</h1>
    <p className="mt-3">{order.restaurantName} · #{order.code}</p>
    <p role="status" className="my-5 rounded-xl bg-fg/10 p-4">{order.voided ? "Anulado" : ORDER_STATUS_LABELS[order.status]} · {order.channel === "delivery" ? "Delivery" : "Recojo"}</p>
    <p>{order.customerName} · {order.address}{order.zone ? ` · ${order.zone}` : ""}</p>
    {order.reference && <p>Referencia: {order.reference}</p>}
    {order.notes && <p>{order.notes}</p>}
    <p className="mt-3">Tiempo estimado: {order.estimatedMinutes} min</p>
    <ul className="my-6 divide-y divide-fg/10">{(order.items as OrderItemInput[]).map((line, i) => <li key={i} className="flex justify-between gap-4 py-3"><span>{line.quantity} × {line.name}{line.note && <small className="block">{line.note}</small>}</span><strong>{formatCurrency(line.price * line.quantity)}</strong></li>)}</ul>
    <p className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.total - order.deliveryFee)}</span></p>
    <p className="flex justify-between"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></p>
    <p className="my-3 flex justify-between text-xl font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></p>
    <p>{order.paymentMethod && PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.paid ? "Pagado" : "Pendiente de cobro"}</p>
    <p className="mt-6 text-sm text-muted">Guarda este enlace privado para consultar el estado de tu pedido.</p>
    <div className="mt-5 flex flex-wrap gap-5"><a href={`/pedido/${slug}`}>Volver a la carta</a>{contact && <a href={contact} rel="noreferrer" target="_blank">Contactar al restaurante</a>}</div>
  </main>;
}
