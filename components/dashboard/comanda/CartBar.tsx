"use client";

import { formatPrice } from "@/components/dashboard/menu/ui";

export default function CartBar({
  count,
  total,
  sending,
  onSend,
}: {
  count: number;
  total: number;
  sending: boolean;
  onSend: () => void;
}) {
  const disabled = count === 0 || sending;

  return (
    <div className="sticky bottom-0 z-30 border-t border-white/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/85">
            {count === 0 ? "Sin platos" : `${count} ${count === 1 ? "plato" : "platos"}`}
          </p>
          <p className="text-[12px] text-white/45">{formatPrice(total)}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSend}
          className="h-12 shrink-0 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-6 text-[14px] font-bold text-ink-950 transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          {sending ? "Enviando…" : "Enviar a cocina"}
        </button>
      </div>
    </div>
  );
}
