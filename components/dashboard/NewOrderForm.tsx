"use client";

import { useMemo, useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { createOrder, type OrderChannel } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { CHANNEL_LABELS } from "@/lib/orderMeta";
import { formatCurrency } from "@/lib/format";

export type MenuItemOption = { id: string; name: string; price: number };

export default function NewOrderForm({ menuItems }: { menuItems: MenuItemOption[] }) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("dine_in");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

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
        items: lineItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
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

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="self-start">
        Registrar pedido
      </Button>
    );
  }

  return (
    <GlassCard className="p-5 sm:p-6" hoverLift={false}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white/90">Registrar pedido</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-white/40 hover:text-white/70"
        >
          Cancelar
        </button>
      </div>

      {menuItems.length === 0 ? (
        <p className="text-[14px] text-white/40">
          Primero agrega platos disponibles a la carta para registrar pedidos.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
              className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
            />
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as OrderChannel)}
              className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white outline-none focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
            >
              {(Object.keys(CHANNEL_LABELS) as OrderChannel[]).map((c) => (
                <option key={c} value={c} className="bg-ink-900">
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-white/85">{item.name}</p>
                  <p className="text-[12px] text-white/40">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQty(item.id, (quantities[item.id] ?? 0) - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] text-white/60 hover:bg-white/[0.06]"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-[13.5px] text-white/85">
                    {quantities[item.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, (quantities[item.id] ?? 0) + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] text-white/60 hover:bg-white/[0.06]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
            <span className="text-[14px] text-white/60">
              Total: <span className="font-semibold text-white/90">{formatCurrency(total)}</span>
            </span>
            <Button type="submit" size="md" disabled={isPending}>
              {isPending ? "Registrando…" : "Registrar pedido"}
            </Button>
          </div>
        </form>
      )}

      {error && <p className="mt-2.5 text-[13px] text-accent-400">{error}</p>}
    </GlassCard>
  );
}
