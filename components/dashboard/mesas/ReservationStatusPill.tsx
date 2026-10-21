import { RESERVATION_STATUS_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";

// One colour per state, shared by the pill, the agenda bar and the week grid,
// so a reservation reads the same wherever it shows up.
export const RESERVATION_TONE: Record<ReservationStatusValue, { color: string; bg: string }> = {
  pendiente: { color: "#f5c76a", bg: "rgba(245,199,106,0.12)" },
  confirmada: { color: "#f3efe6", bg: "rgba(243,239,230,0.1)" },
  sentada: { color: "#3ddc97", bg: "rgba(61,220,151,0.12)" },
  cancelada: { color: "#8a8278", bg: "rgba(243,239,230,0.06)" },
  no_show: { color: "#ff7a57", bg: "rgba(255,90,51,0.12)" },
};

export default function ReservationStatusPill({ status }: { status: ReservationStatusValue }) {
  const tone = RESERVATION_TONE[status];
  return (
    <span className="lbd-rv-pill" style={{ color: tone.color, background: tone.bg }}>
      {RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}
