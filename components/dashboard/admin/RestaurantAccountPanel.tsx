"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRestaurant, updateRestaurantPlan, deleteRestaurant } from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { PLANS, PLAN_LABELS, PLAN_MAX_USERS, PLAN_PRICES, type PlanValue } from "@/lib/plans";

/**
 * The venue's account on its own page, design B: the plan (a switch that
 * saves on tap), the owner and name (edited in place), and the delete behind
 * a second tap. A venue whose plan is paid with a card cannot have it changed
 * by hand: the server refuses and says so, and the switch is shown disabled.
 */
export default function RestaurantAccountPanel({
  id,
  name,
  ownerEmail,
  plan,
  staffCount,
  stateLabel,
  stateColor,
  source,
  nextLine,
  nextValue,
  since,
  locked,
}: {
  id: string;
  name: string;
  ownerEmail: string;
  plan: PlanValue;
  staffCount: number;
  stateLabel: string;
  stateColor: string;
  /** Who decides the plan: a manual grant or a card subscription. */
  source: string;
  nextLine: string;
  nextValue: string;
  since: string;
  /** A live card subscription: the plan cannot be changed by hand. */
  locked: boolean;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(ownerEmail);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function changePlan(next: PlanValue) {
    if (next === plan) return;
    const cap = PLAN_MAX_USERS[next];
    startTransition(async () => {
      const result = await updateRestaurantPlan(id, next);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      // Waiters already added can exceed a downgraded plan's cap: warn, don't block.
      const over = cap !== Infinity && staffCount + 1 > cap;
      pushToast(over ? `${name} → ${PLAN_LABELS[next]}. Ojo: tiene ${staffCount + 1} usuarios y el plan permite ${cap}.` : `${name} → plan ${PLAN_LABELS[next]}.`, over ? "error" : "success");
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updateRestaurant(id, { name: draftName, ownerEmail: draftEmail, plan });
      if (result.ok) {
        setEditing(false);
        pushToast("Datos del local actualizados.", "success");
        router.refresh();
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteRestaurant(id);
      if (result.ok) {
        pushToast(`${name} eliminado.`, "success");
        router.push("/dashboard/admin/restaurants");
      } else {
        pushToast(result.error, "error");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <>
      <section className="lbd-card lbd-ad-panel lbd-rise" style={{ animationDelay: ".15s" }} aria-label="Suscripción">
        <span className="lbd-ad-h">Suscripción</span>
        <div className="lbd-ad-plan-big">
          <strong className="lbd-display">{PLAN_LABELS[plan]}</strong>
          <span>{PLAN_PRICES[plan]} al mes + IGV</span>
        </div>
        <div className="lbd-seg lbd-ad-planswitch" role="group" aria-label="Cambiar plan">
          {PLANS.map((p) => (
            <button key={p} type="button" disabled={isPending || locked} aria-pressed={plan === p} className={plan === p ? "is-on" : undefined} onClick={() => changePlan(p)}>
              {PLAN_LABELS[p]}
            </button>
          ))}
        </div>
        <p className="lbd-bl-help" style={{ margin: 0 }}>
          {locked ? "Paga con tarjeta: el plan se cambia desde su suscripción, no a mano." : "Cambiar el plan lo deja asignado a mano y activo, sin cobro, hasta que el dueño suscriba el suyo."}
        </p>
        <dl className="lbd-ad-dl">
          <div>
            <dt>Estado</dt>
            <dd style={{ color: stateColor, fontWeight: 600 }}>{stateLabel}</dd>
          </div>
          <div>
            <dt>Plan decidido por</dt>
            <dd>{source}</dd>
          </div>
          <div>
            <dt>{nextLine}</dt>
            <dd>{nextValue}</dd>
          </div>
          <div>
            <dt>Cliente desde</dt>
            <dd>{since}</dd>
          </div>
        </dl>
      </section>

      <section className="lbd-card lbd-ad-panel lbd-rise" style={{ animationDelay: ".18s" }} aria-label="Datos del local">
        <div className="lbd-ad-head">
          <span className="lbd-ad-h">Datos del local</span>
          {!editing && (
            <button type="button" className="lbd-bl-link" onClick={() => setEditing(true)}>
              Editar
            </button>
          )}
        </div>
        {editing ? (
          <>
            <label className="lbd-wp-field" htmlFor="ra-name">
              Nombre
              <input id="ra-name" className="lbd-input" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </label>
            <label className="lbd-wp-field" htmlFor="ra-owner">
              Correo del dueño
              <input id="ra-owner" type="email" className="lbd-input" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={isPending} className="lbd-btn lbd-btn--solid lbd-btn--sm" onClick={save}>
                Guardar
              </button>
              <button
                type="button"
                disabled={isPending}
                className="lbd-btn lbd-btn--ghost lbd-btn--sm"
                onClick={() => {
                  setDraftName(name);
                  setDraftEmail(ownerEmail);
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <dl className="lbd-ad-dl">
            <div>
              <dt>Nombre</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>Dueño</dt>
              <dd>{ownerEmail}</dd>
            </div>
            <div>
              <dt>Usuarios</dt>
              <dd>
                {staffCount + 1}
                {PLAN_MAX_USERS[plan] === Infinity ? "" : ` de ${PLAN_MAX_USERS[plan]}`}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="lbd-card lbd-ad-panel lbd-ad-danger lbd-rise" style={{ animationDelay: ".21s" }} aria-label="Eliminar el local">
        <span className="lbd-ad-h">Eliminar el local</span>
        <p className="lbd-bl-help" style={{ margin: 0 }}>
          Borra sus pedidos, carta, mesas, clientes y equipo. No se puede deshacer. Si paga con tarjeta, cancela primero la suscripción.
        </p>
        <button type="button" disabled={isPending} onClick={remove} onBlur={() => setConfirmDelete(false)} className={`lbd-btn lbd-btn--sm ${confirmDelete ? "lbd-btn--solid" : "lbd-btn--ghost"}`} style={{ alignSelf: "flex-start" }}>
          {confirmDelete ? "¿Seguro? Toca otra vez" : "Eliminar restaurante"}
        </button>
      </section>
    </>
  );
}
