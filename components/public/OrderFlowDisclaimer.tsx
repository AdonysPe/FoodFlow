const TEXT =
  "La web de pedidos directa se activa bajo demanda. Esta demo redirige el pedido a WhatsApp para su confirmación";

export default function OrderFlowDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={
        compact
          ? "px-4 py-2 text-center text-[8.5px] leading-snug text-white/35"
          : "rounded-xl border border-fg/[0.08] bg-fg/[0.025] px-4 py-3 text-center text-[11.5px] leading-relaxed text-fg/40"
      }
    >
      {TEXT}
    </p>
  );
}
