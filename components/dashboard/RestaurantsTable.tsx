"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import {
  updateRestaurant,
  updateRestaurantPlan,
  deleteRestaurant,
} from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  PLANS,
  PLAN_LABELS,
  PLAN_MAX_USERS,
  PLAN_PRICES,
  type PlanValue,
} from "@/lib/plans";
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

const BILLING_TONE: Record<RestaurantRow["billingStatus"], string> = {
  active: "bg-mint/10 text-mint-ink ring-mint/25",
  pending: "bg-fg/[0.06] text-muted ring-fg/15",
  cancelled: "bg-accent-500/12 text-accent-ink ring-accent-400/30",
  trialing: "bg-mint/10 text-mint-ink ring-mint/25",
  past_due: "bg-warn/10 text-warn-ink ring-warn/25",
  suspended: "bg-accent-500/12 text-accent-ink ring-accent-400/30",
};

const BILLING_LABEL: Record<RestaurantRow["billingStatus"], string> = {
  active: "Activo",
  pending: "Pendiente",
  cancelled: "Cancelado",
  trialing: "En prueba",
  past_due: "Pago atrasado",
  suspended: "Suspendido",
};

/**
 * The venue's identity as the platform set it: the category, and underneath it
 * the template its carta renders with. "por categoría" is what distinguishes a
 * venue following its category's default from one carrying an override — the
 * whole distinction the configure screen exists to manage.
 */
function IdentityCell({ restaurant }: { restaurant: RestaurantRow }) {
  return (
    <>
      <p className="text-fg/85">{restaurant.categoryName}</p>
      <p className="text-[12px] text-faint">
        {restaurant.templateLabel}
        {restaurant.templateIsDefault ? " · por categoría" : " · personalizada"}
      </p>
    </>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 text-[13.5px] text-fg outline-none focus:border-accent-400/50";

const PLAN_TONE: Record<PlanValue, string> = {
  carta: "bg-fg/[0.06] text-muted ring-fg/15",
  servicio: "bg-accent-400/10 text-accent-ink ring-accent-400/25",
  negocio: "bg-mint/10 text-mint-ink ring-mint/25",
};

// Changing the plan is the one thing an admin does most on this screen, so it
// is a one-click select on the row rather than something behind "Edit".
function PlanPicker({ restaurant }: { restaurant: RestaurantRow }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  // Waiters already added can exceed a downgraded plan's cap — warn, don't block.
  function change(next: PlanValue) {
    const cap = PLAN_MAX_USERS[next];
    startTransition(async () => {
      const result = await updateRestaurantPlan(restaurant.id, next);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      const overCap = cap !== Infinity && restaurant.staffCount + 1 > cap;
      pushToast(
        overCap
          ? `${restaurant.name} → ${PLAN_LABELS[next]}. Ojo: tiene ${restaurant.staffCount + 1} usuarios y el plan permite ${cap}.`
          : `${restaurant.name} → plan ${PLAN_LABELS[next]}.`,
        overCap ? "error" : "success"
      );
    });
  }

  return (
    <select
      value={restaurant.plan}
      disabled={isPending}
      onChange={(e) => change(e.target.value as PlanValue)}
      aria-label={`Plan de ${restaurant.name}`}
      className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset outline-none disabled:opacity-40 ${PLAN_TONE[restaurant.plan]}`}
    >
      {PLANS.map((p) => (
        <option key={p} value={p} className="bg-ink-900 text-fg">
          {PLAN_LABELS[p]} · {PLAN_PRICES[p]}
        </option>
      ))}
    </select>
  );
}

function RestaurantRowItem({ restaurant }: { restaurant: RestaurantRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [ownerEmail, setOwnerEmail] = useState(restaurant.ownerEmail);
  const [plan, setPlan] = useState<PlanValue>(restaurant.plan);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSave() {
    startTransition(async () => {
      const result = await updateRestaurant(restaurant.id, { name, ownerEmail, plan });
      if (result.ok) {
        setEditing(false);
        pushToast("Restaurante actualizado.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteRestaurant(restaurant.id);
      pushToast(
        result.ok ? `${restaurant.name} eliminado.` : result.error,
        result.ok ? "success" : "error"
      );
      setConfirmingDelete(false);
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-fg/[0.04] last:border-0">
        <td className="px-5 py-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </td>
        <td className="px-5 py-3">
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className={inputClass}
          />
        </td>
        <td className="px-5 py-3">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanValue)}
            className={inputClass}
          >
            {PLANS.map((p) => (
              <option key={p} value={p} className="bg-ink-900">
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </td>
        <td className="px-5 py-3">
          <IdentityCell restaurant={restaurant} />
        </td>
        <td className="px-5 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${BILLING_TONE[restaurant.billingStatus]}`}
          >
            {BILLING_LABEL[restaurant.billingStatus]}
          </span>
        </td>
        <td className="px-5 py-3 text-faint">{restaurant.createdAtLabel}</td>
        <td className="px-5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-40"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setName(restaurant.name);
                setOwnerEmail(restaurant.ownerEmail);
                setPlan(restaurant.plan);
                setEditing(false);
              }}
              className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-fg/70 hover:bg-fg/[0.08]"
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-fg/[0.04] last:border-0">
      <td className="px-5 py-3.5 font-medium text-fg/85">{restaurant.name}</td>
      <td className="px-5 py-3.5 text-muted">
        <p>{restaurant.ownerEmail}</p>
        <p className="text-[12px] text-faint">
          {restaurant.staffCount + 1}{" "}
          {PLAN_MAX_USERS[restaurant.plan] === Infinity
            ? "usuarios"
            : `de ${PLAN_MAX_USERS[restaurant.plan]} usuarios`}
        </p>
      </td>
      <td className="px-5 py-3.5">
        <PlanPicker restaurant={restaurant} />
      </td>
      <td className="px-5 py-3.5">
        <IdentityCell restaurant={restaurant} />
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${BILLING_TONE[restaurant.billingStatus]}`}
        >
          {BILLING_LABEL[restaurant.billingStatus]}
        </span>
      </td>
      <td className="px-5 py-3.5 text-faint">{restaurant.createdAtLabel}</td>
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/admin/restaurants/${restaurant.id}`}
            className="rounded-lg border border-accent-400/30 bg-accent-400/10 px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-400/20"
          >
            Configurar
          </Link>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-fg/70 transition-colors hover:bg-fg/[0.08] hover:text-fg"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-40 ${
              confirmingDelete
                ? "bg-accent-500 text-fg hover:bg-accent-600"
                : "border border-fg/[0.1] bg-fg/[0.04] text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
            }`}
          >
            {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function RestaurantsTable({ restaurants }: { restaurants: RestaurantRow[] }) {
  if (restaurants.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-faint" hoverLift={false}>
        Todavía no hay restaurantes. Crea el primero para empezar.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-fg/[0.07] text-[12px] uppercase tracking-wide text-faint">
              <th className="px-5 py-3.5 font-medium">Restaurante</th>
              <th className="px-5 py-3.5 font-medium">Propietario</th>
              <th className="px-5 py-3.5 font-medium">Plan</th>
              <th className="px-5 py-3.5 font-medium">Categoría y plantilla</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
              <th className="px-5 py-3.5 font-medium">Alta</th>
              <th className="px-5 py-3.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <RestaurantRowItem key={r.id} restaurant={r} />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
