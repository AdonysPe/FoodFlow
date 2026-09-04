"use client";

import { formatPrice } from "@/components/dashboard/menu/ui";

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
    <div className="sticky bottom-0 z-30 border-t border-fg/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
      {/* Asked here rather than up front: by now the server has the table in
          front of them and is about to send, and it stays optional so a busy
          service is never held up by a name nobody gave. */}
      {askName && (
        <div className="mb-2.5">
          <label htmlFor="comanda-customer" className="sr-only">
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
            className="h-10 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-3.5 text-[13.5px] text-fg placeholder:text-fg/30 outline-none transition-colors focus:border-accent-400/50 focus:bg-fg/[0.06]"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg/85">
            {count === 0 ? "Sin platos" : `${count} ${count === 1 ? "plato" : "platos"}`}
          </p>
          <p className="text-[12px] text-fg/45">{formatPrice(total)}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSend}
          className="h-12 shrink-0 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-6 text-[14px] font-bold text-on-accent transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          {sending ? "Enviando…" : "Enviar a cocina"}
        </button>
      </div>
    </div>
  );
}
