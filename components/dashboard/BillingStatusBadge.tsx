import type { BillingStatusValue } from "@/lib/subscriptions/entitlement";

export type { BillingStatusValue };

// Same colour per state as the admin's restaurant list, so the owner and the
// operator read a subscription the same way.
const STATUS: Record<BillingStatusValue, { label: string; color: string; bg: string }> = {
  pending: { label: "Cobro pendiente", color: "#f5c76a", bg: "rgba(245,199,106,0.12)" },
  active: { label: "Cobro activo", color: "#3ddc97", bg: "rgba(61,220,151,0.12)" },
  trialing: { label: "En prueba", color: "#5fd6c5", bg: "rgba(95,214,197,0.12)" },
  past_due: { label: "Pago atrasado", color: "#ff7a57", bg: "rgba(255,90,51,0.14)" },
  suspended: { label: "Suspendido", color: "#c5bdb1", bg: "rgba(243,239,230,0.07)" },
  cancelled: { label: "Cobro cancelado", color: "#c5bdb1", bg: "rgba(243,239,230,0.07)" },
};

export default function BillingStatusBadge({ status }: { status: BillingStatusValue }) {
  const value = STATUS[status];

  return (
    <span className="lbd-sb-badge" style={{ color: value.color, background: value.bg }}>
      <i aria-hidden="true" />
      {value.label}
    </span>
  );
}
