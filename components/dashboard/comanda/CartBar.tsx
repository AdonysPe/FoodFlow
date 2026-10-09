"use client";

import { formatPrice } from "@/components/dashboard/menu/ui";

/**
 * The floating glass bar at the foot of the item picker: how many dishes,
 * what they add up to, and the one button that sends the round to the kitchen.
 */
export default function CartBar({
  count,
  total,
  sending,
  onSend,
  askName = false,
  customerName = "",
  onCustomerNameChange,
}: {
  count: number;
  total: number;
  sending: boolean;
  onSend: () => void;
  /** Only when the order is being opened — a new round inherits the name. */
  askName?: boolean;
  customerName?: string;
  onCustomerNameChange?: (value: string) => void;
}) {
  const disabled = count === 0 || sending;

  return (
    <div className="lbd-cm-cart">
      {/* Asked here rather than up front: by now the server has the table in
          front of them and is about to send, and it stays optional so a busy
          service is never held up by a name nobody gave. */}
      {askName && (
        <div>
          <label htmlFor="comanda-customer" className="lb-sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            ¿A nombre de quién?
          </label>
          <input
            id="comanda-customer"
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange?.(e.target.value)}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="¿A nombre de quién? (opcional)"
            className="lbd-input"
            style={{ height: 42, fontSize: 14 }}
          />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}>
        <span style={{ fontSize: 14, color: "#cfc7bb" }}>{count === 0 ? "Pedido vacío" : `${count} ${count === 1 ? "plato" : "platos"}`}</span>
        <span className="lbd-display" style={{ fontSize: 26, letterSpacing: "-0.04em" }}>
          {formatPrice(total)}
        </span>
      </div>

      <button type="button" disabled={disabled} onClick={onSend} className="lbd-cm-send">
        {sending ? "Enviando…" : "Enviar a cocina"}
      </button>
    </div>
  );
}
