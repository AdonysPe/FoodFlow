import { RESERVATION_STATUS_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";

// Same pill grammar as components/dashboard/StatusPill — a dot plus a label
// inside a tinted, ring-inset capsule.
const TONE: Record<ReservationStatusValue, string> = {
  pendiente: "bg-amber-300/10 text-amber-200 ring-amber-300/25",
  confirmada: "bg-mint/10 text-mint ring-mint/25",
  sentada: "bg-accent-400/10 text-accent-300 ring-accent-400/25",
  cancelada: "bg-white/[0.06] text-white/50 ring-white/15",
  no_show: "bg-white/[0.06] text-white/50 ring-white/15",
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
