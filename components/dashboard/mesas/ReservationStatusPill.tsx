import { RESERVATION_STATUS_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";

// Same pill grammar as components/dashboard/StatusPill — a dot plus a label
// inside a tinted, ring-inset capsule.
const TONE: Record<ReservationStatusValue, string> = {
  pendiente: "bg-warn/10 text-warn-ink ring-warn/25",
  confirmada: "bg-mint/10 text-mint-ink ring-mint/25",
  sentada: "bg-accent-400/10 text-accent-ink ring-accent-400/25",
  cancelada: "bg-fg/[0.06] text-muted ring-fg/15",
  no_show: "bg-fg/[0.06] text-muted ring-fg/15",
};

export default function ReservationStatusPill({
  status,
}: {
  status: ReservationStatusValue;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${TONE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}
