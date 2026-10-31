"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createRestaurant } from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { PLANS, PLAN_LABELS, PLAN_PRICES, PLAN_SUMMARIES, type PlanValue } from "@/lib/plans";

/**
 * "Nuevo restaurante", design B: a button for the header that opens a drawer
 * (a bottom sheet on a phone). The drawer mounts on the panel root so the
 * animated header it sits in cannot trap it behind the list.
 */
export default function CreateRestaurantForm() {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  // Defaults to the plan the pricing page calls "Más elegido".
  const [plan, setPlan] = useState<PlanValue>("servicio");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  useEffect(() => {
    setHost(document.querySelector(".lbd") ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createRestaurant({ name, ownerEmail, plan });
      if (result.ok) {
        setName("");
        setOwnerEmail("");
        setPlan("servicio");
        setOpen(false);
        pushToast("Restaurante creado.", "success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" className="lbd-cta" onClick={() => setOpen(true)}>
        + Nuevo restaurante
      </button>
      {open &&
        host &&
        createPortal(
          <>
            <div className="lbd-ad-scrim" onMouseDown={() => setOpen(false)} aria-hidden="true" />
            <form className="lbd-ad-drawer lbd-ad-drawer--form" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Nuevo restaurante">
              <div className="lbd-ad-drawer-head">
                <h2 className="lbd-display" style={{ fontSize: 26 }}>
                  Nuevo restaurante
                </h2>
                <button type="button" className="lbd-ad-ico" onClick={() => setOpen(false)} aria-label="Cerrar">
                  ×
                </button>
              </div>
              <p className="lbd-bl-help" style={{ margin: 0, fontSize: 13 }}>
                Creas el local y la cuenta del dueño. Entra con su correo y un código. El plan queda asignado a mano, sin cobro, hasta que él suscriba el suyo.
              </p>
              <label className="lbd-wp-field" htmlFor="nr-nombre">
                Nombre del local
                <input id="nr-nombre" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Cevichería El Muelle" className="lbd-input" autoFocus />
              </label>
              <label className="lbd-wp-field" htmlFor="nr-correo">
                Correo del dueño
                <input id="nr-correo" type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="dueno@turestaurante.pe" className="lbd-input" />
              </label>
              <div className="lbd-wp-field">
                Plan
                <div role="group" aria-label="Plan" className="lbd-ad-planpick">
                  {PLANS.map((p) => (
                    <button key={p} type="button" aria-pressed={plan === p} className={plan === p ? "is-on" : undefined} onClick={() => setPlan(p)}>
                      {PLAN_LABELS[p]}
                      <small>{PLAN_PRICES[p]} · IGV incluido</small>
                    </button>
                  ))}
                </div>
                <small>{PLAN_SUMMARIES[plan]}</small>
              </div>
              {error && (
                <p role="alert" className="lbd-modal-error">
                  {error}
                </p>
              )}
              <button type="submit" disabled={isPending} className="lbd-btn lbd-btn--solid" style={{ marginTop: "auto" }}>
                {isPending ? "Creando…" : "Crear restaurante"}
              </button>
            </form>
          </>,
          host
        )}
    </>
  );
}
