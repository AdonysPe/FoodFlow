"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createOrder, type OrderChannel } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { CHANNEL_LABELS } from "@/lib/orderMeta";
import { formatCurrency } from "@/lib/format";

export type MenuItemOption = { id: string; name: string; price: number };

/**
 * "Registrar pedido": the orange button in the screen's header and, once
 * pressed, a glass dialog with the customer, the channel and the dishes.
 * `createOrder` and its validation are the ones that were here.
 */
export default function NewOrderForm({ menuItems }: { menuItems: MenuItemOption[] }) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("dine_in");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const lineItems = useMemo(
    () =>
      menuItems
        .filter((item) => (quantities[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: quantities[item.id] })),
    [menuItems, quantities]
  );
  const total = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function setQty(id: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  function reset() {
    setCustomerName("");
    setCustomerPhone("");
    setChannel("dine_in");
    setQuantities({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (lineItems.length === 0) {
      setError("Agrega al menos un plato.");
      return;
    }
    startTransition(async () => {
      const result = await createOrder({
        customerName,
        customerPhone: customerPhone || undefined,
        channel,
        items: lineItems.map((i) => ({ menuItemId: i.id, quantity: i.quantity })),
      });
      if (result.ok) {
        reset();
        setOpen(false);
        pushToast("Pedido registrado.", "success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="lbd-cta">
        Registrar pedido
      </button>

      {open && (
        <div className="lbd-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="lbd-modal-card lbd-pop" role="dialog" aria-modal="true" aria-labelledby="new-order-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 id="new-order-title" className="lbd-display" style={{ margin: 0, fontSize: 26, letterSpacing: "-0.04em" }}>
                Registrar pedido
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
                Cancelar
              </button>
            </div>

            {menuItems.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#a39b90" }}>Primero agrega platos disponibles a la carta para registrar pedidos.</p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
                <div className="lbd-modal-fields">
                  <input ref={nameRef} required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" aria-label="Nombre del cliente" className="lbd-input" />
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono (opcional)" aria-label="Teléfono" className="lbd-input" />
                  <select value={channel} onChange={(e) => setChannel(e.target.value as OrderChannel)} aria-label="Canal" className="lbd-input">
                    {(Object.keys(CHANNEL_LABELS) as OrderChannel[]).map((c) => (
                      <option key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lbd-modal-list">
                  {menuItems.map((item) => {
                    const qty = quantities[item.id] ?? 0;
                    return (
                      <div key={item.id} className={`lbd-modal-item${qty > 0 ? " is-on" : ""}`}>
                        <div style={{ minWidth: 0 }}>
                          <p className="lbd-trunc" style={{ margin: 0, fontSize: 14, fontWeight: 550 }}>
                            {item.name}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: "#a39b90" }}>{formatCurrency(item.price)}</p>
                        </div>
                        <div className="lbd-stepper">
                          <button type="button" onClick={() => setQty(item.id, qty - 1)} aria-label={`Quitar uno de ${item.name}`} disabled={qty === 0}>
                            −
                          </button>
                          <span className="lbd-mono">{qty}</span>
                          <button type="button" onClick={() => setQty(item.id, qty + 1)} aria-label={`Agregar ${item.name}`}>
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <p role="alert" className="lbd-modal-error">
                    {error}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "#a39b90" }}>
                    Total <span className="lbd-display" style={{ marginLeft: 6, fontSize: 24, letterSpacing: "-0.04em", color: "#f3efe6" }}>{formatCurrency(total)}</span>
                  </span>
                  <button type="submit" disabled={isPending} className="lbd-btn lbd-btn--solid" style={{ minWidth: 180 }}>
                    {isPending ? "Registrando…" : "Registrar pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
