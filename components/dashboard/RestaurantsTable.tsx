import Link from "next/link";
import { PLAN_LABELS, PLAN_MAX_USERS, type PlanValue } from "@/lib/plans";
import type { BillingStatusValue } from "@/lib/subscriptions/entitlement";

export type RestaurantRow = {
  id: string;
  name: string;
  ownerEmail: string;
  plan: PlanValue;
  staffCount: number;
  /** Name of the platform category the venue is filed under. */
  categoryName: string;
  /** Display name of the template its carta actually renders with. */
  templateLabel: string;
  /** True when the venue follows its category instead of carrying an override. */
  templateIsDefault: boolean;
  billingStatus: BillingStatusValue;
  slug: string | null;
  createdAtLabel: string;
};

export const BILLING: Record<BillingStatusValue, { label: string; color: string }> = {
  active: { label: "Activo", color: "#3ddc97" },
  trialing: { label: "En prueba", color: "#f3efe6" },
  pending: { label: "Por activar", color: "#a39b90" },
  past_due: { label: "Pago atrasado", color: "#ff7a57" },
  suspended: { label: "Suspendido", color: "#8a8278" },
  cancelled: { label: "Cancelado", color: "#8a8278" },
};

export const PLAN_TONE: Record<PlanValue, { bg: string; fg: string }> = {
  negocio: { bg: "#ff5a33", fg: "#0c0908" },
  servicio: { bg: "#f3efe6", fg: "#0c0908" },
  carta: { bg: "rgba(243,239,230,0.08)", fg: "#cfc7bb" },
};

const AVATARS = [
  { bg: "#ff5a33", fg: "#0c0908" },
  { bg: "#f3efe6", fg: "#0c0908" },
  { bg: "#3a302b", fg: "#f3efe6" },
];

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * The platform's venues as a list, design B: one row per local with its plan,
 * how its billing stands, its category and template, and how many people use
 * it. Each row opens the venue's own page, where the plan, the data, the
 * template and the delete live.
 */
export default function RestaurantsTable({ restaurants }: { restaurants: RestaurantRow[] }) {
  if (restaurants.length === 0) {
    return <div className="lbd-empty">Todavía no hay restaurantes. Crea el primero para empezar.</div>;
  }

  return (
    <section className="lbd-card lbd-rise lbd-ad-list" style={{ animationDelay: ".1s" }} aria-label="Lista de restaurantes">
      <div className="lbd-ad-lrow lbd-ad-lhead lbd-mono" aria-hidden>
        <span>LOCAL</span>
        <span>DUEÑO</span>
        <span>PLAN</span>
        <span>COBRO</span>
        <span>CATEGORÍA · PLANTILLA</span>
        <span style={{ textAlign: "right" }}>EQUIPO</span>
      </div>
      {restaurants.map((r, index) => {
        const avatar = AVATARS[index % AVATARS.length];
        const tone = PLAN_TONE[r.plan];
        const bill = BILLING[r.billingStatus];
        const cap = PLAN_MAX_USERS[r.plan];
        return (
          <Link key={r.id} href={`/dashboard/admin/restaurants/${r.id}`} className="lbd-ad-lrow lbd-ad-lrow--item">
            <span className="lbd-ad-lname">
              <span className="lbd-cu-av" style={{ background: avatar.bg, color: avatar.fg, borderRadius: 11 }}>
                {initialsOf(r.name)}
              </span>
              <span>
                <strong className="lbd-trunc">{r.name}</strong>
                <small className="lbd-mono">
                  {r.slug ? `/${r.slug}` : "sin carta"} · alta {r.createdAtLabel}
                </small>
              </span>
            </span>
            <span className="lbd-ad-lowner lbd-trunc">{r.ownerEmail}</span>
            <span>
              <span className="lbd-ad-plan" style={{ background: tone.bg, color: tone.fg }}>
                {PLAN_LABELS[r.plan]}
              </span>
            </span>
            <span className="lbd-ad-bill" style={{ color: bill.color }}>
              <i aria-hidden />
              {bill.label}
            </span>
            <span className="lbd-ad-lcat">
              {r.categoryName} · <span>{r.templateLabel}</span>
              {r.templateIsDefault ? "" : " (propia)"}
            </span>
            <span className="lbd-ad-lstaff lbd-mono">
              {r.staffCount + 1}
              {cap === Infinity ? "" : `/${cap}`}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
