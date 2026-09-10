export type BillingStatusValue = "pending" | "active" | "cancelled";

const STATUS: Record<
  BillingStatusValue,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: "Cobro pendiente",
    className: "bg-warn/10 text-warn-ink ring-warn/25",
    dotClassName: "bg-warn",
  },
  active: {
    label: "Cobro activo",
    className: "bg-mint/10 text-mint-ink ring-mint/25",
    dotClassName: "bg-mint",
  },
  cancelled: {
    label: "Cobro cancelado",
    className: "bg-fg/[0.06] text-muted ring-fg/15",
    dotClassName: "bg-fg/35",
  },
};

export default function BillingStatusBadge({ status }: { status: BillingStatusValue }) {
  const value = STATUS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${value.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${value.dotClassName}`} aria-hidden />
      {value.label}
    </span>
  );
}
