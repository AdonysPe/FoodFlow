import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import { whatsappLink } from "@/lib/carta";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import { lbFontClasses } from "@/components/landing/lbFonts";
import type { OrderItemInput } from "@/lib/actions/orders";
import type { readOnlineOrder } from "@/lib/db/orderingWebsite";

export type TrackedOrder = NonNullable<Awaited<ReturnType<typeof readOnlineOrder>>>;

// Circumference of the progress ring (r = 120), the length the stroke is cut to.
const RING = 754;

const STEP_LABELS = ["Recibido", "Cocina", "Listo"] as const;

type Stage = { step: number; title: string; sub: string };

/** Where an order stands, in the words a diner uses. `step` is 1 to 4. */
function stageOf(order: { status: string; channel: string; estimatedMinutes: number | null }): Stage {
  const delivery = order.channel === "delivery";
  switch (order.status) {
    case "preparing":
      return { step: 2, title: "En cocina", sub: order.estimatedMinutes ? `Listo en unos ${order.estimatedMinutes} min` : "Lo estamos preparando" };
    case "ready":
      return { step: 3, title: "Listo", sub: delivery ? "Sale hacia tu dirección" : "Ya puedes recogerlo" };
    case "delivered":
      return { step: 4, title: "¡Buen provecho!", sub: delivery ? "Entregado" : "Recogido en el local" };
    default:
      return { step: 1, title: "Recibido", sub: "El restaurante ya tiene tu pedido" };
  }
}

/**
 * Seguimiento del pedido, design B: a ring that fills as the order moves
 * (recibido, cocina, listo, servido), the four steps under it, and the
 * ticket with what was ordered and what it costs. The page refreshes itself
 * every few seconds; the ring and the step bars ease into the new state.
 */
export default function OrderTracking({ slug, order }: { slug: string; order: TrackedOrder }) {
  const contact = whatsappLink(order.whatsapp, `Consulta sobre mi pedido ${order.code}`);
  const lines = order.items as OrderItemInput[];
  const stage: Stage = order.voided ? { step: 0, title: "Anulado", sub: "El restaurante anuló este pedido" } : stageOf(order);
  const delivery = order.channel === "delivery";
  const labels = [...STEP_LABELS, delivery ? "Entregado" : "Recogido"];

  return (
    <div data-theme="dark" className={`${lbFontClasses} lb lb-st`} style={{ paddingTop: 0 }}>
      <main id="main" className="lb-st-page">
        <AutoRefresh intervalMs={8000} />
        <div className="lb-st-glow" aria-hidden />

        <header className="lb-st-top">
          <Link href={`/pedido/${slug}`} className="lb-st-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Carta
          </Link>
          <span className="lb-mono lb-st-code">
            #{order.code} · {delivery ? "DELIVERY" : "RECOJO"}
          </span>
        </header>

        <p className="lb-st-venue">{order.restaurantName}</p>

        <div className="lb-st-ring" role="status" aria-live="polite" data-voided={order.voided || undefined}>
          <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true">
            <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(243,239,230,0.08)" strokeWidth="10" />
            <circle className="lb-st-arc" cx="140" cy="140" r="120" fill="none" stroke={order.voided ? "#6f675e" : "#ff5a33"} strokeWidth="10" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={order.voided ? 0 : Math.round(RING * (1 - stage.step / 4))} transform="rotate(-90 140 140)" style={{ ["--ring" as string]: RING }} />
          </svg>
          {stage.step > 0 && stage.step < 4 && (
            <div className="lb-st-orbit" aria-hidden="true">
              <span />
            </div>
          )}
          <div className="lb-st-center lb-swap" key={`${stage.step}-${order.voided}`}>
            {stage.step > 0 && (
              <span className="lb-mono lb-st-step">
                {stage.step} DE 4
              </span>
            )}
            <span className="lb-display lb-st-title">{stage.title}</span>
            <span className="lb-st-sub">{stage.sub}</span>
          </div>
        </div>

        <ol className="lb-st-steps" aria-label="Avance del pedido">
          {labels.map((label, i) => {
            const on = !order.voided && i < stage.step;
            return (
              <li key={label} data-on={on}>
                <span aria-hidden />
                <small>{label}</small>
              </li>
            );
          })}
        </ol>

        <section className="lb-st-card" aria-label="Tu pedido">
          {lines.map((line, i) => (
            <div key={i} className="lb-st-line">
              <span>
                {line.quantity} × {line.name}
                {line.note && <small>{line.note}</small>}
              </span>
              <span>{formatCurrency(line.price * line.quantity)}</span>
            </div>
          ))}
          <div className="lb-st-rule" />
          {order.deliveryFee > 0 && (
            <>
              <div className="lb-st-line is-dim">
                <span>Subtotal</span>
                <span>{formatCurrency(order.total - order.deliveryFee)}</span>
              </div>
              <div className="lb-st-line is-dim">
                <span>Delivery</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            </>
          )}
          <div className="lb-st-line is-total">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <p className="lb-st-pay">
            {order.paymentMethod && PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.paid ? "Pagado" : "Pendiente de cobro"}
          </p>
        </section>

        {(delivery || order.notes) && (
          <section className="lb-st-card lb-st-where" aria-label="Entrega">
            <span className="lb-mono lb-st-step">{delivery ? "ENTREGA" : "NOTAS"}</span>
            {delivery && (
              <p>
                {order.customerName} · {order.address}
                {order.zone ? ` · ${order.zone}` : ""}
              </p>
            )}
            {order.reference && <p className="is-dim">Referencia: {order.reference}</p>}
            {order.notes && <p className="is-dim">{order.notes}</p>}
          </section>
        )}

        <p className="lb-st-hint">Guarda este enlace privado para consultar el estado de tu pedido.</p>

        <div className="lb-st-actions">
          <Link href={`/pedido/${slug}`} className="lb-st-btn lb-st-btn--ghost">
            Volver a la carta
          </Link>
          {contact && (
            <a href={contact} rel="noreferrer" target="_blank" className="lb-st-btn lb-st-btn--solid">
              Contactar al restaurante
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
