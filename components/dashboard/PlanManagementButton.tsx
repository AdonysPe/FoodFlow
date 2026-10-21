"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { getPlanManagementLinks } from "@/lib/actions/restaurants";
import { PLANS, PLAN_LABELS, type PlanValue } from "@/lib/plans";

type ManagementLinks = {
  changeByPlan: Record<PlanValue, string>;
  cancel: string;
};

export default function PlanManagementButton({
  currentPlan,
  suggestedPlan,
  className = "",
  splitActions = false,
}: {
  currentPlan: PlanValue;
  suggestedPlan?: PlanValue;
  className?: string;
  splitActions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ManagementLinks | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const availablePlans = PLANS.filter((plan) => plan !== currentPlan);
  const [host, setHost] = useState<Element | null>(null);
  // Mounted in the panel root: a blurred card around the button would trap a
  // fixed overlay inside it.
  useEffect(() => { setHost(document.querySelector(".lbd") ?? document.body); }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openModal() {
    setOpen(true);
    setError("");
    if (links) return;

    startTransition(async () => {
      const result = await getPlanManagementLinks();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinks(result.data);
    });
  }

  return (
    <>
      {splitActions ? (
        <div className={`lbd-sb-split ${className}`}>
          <button
            type="button"
            onClick={openModal}
            className="lbd-btn lbd-btn--solid"
          >
            Cambiar plan
          </button>
          <button
            type="button"
            onClick={openModal}
            className="lbd-btn lbd-btn--ghost"
          >
            Cancelar plan
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={`lbd-btn lbd-btn--solid ${className}`}
        >
          Cambiar o Cancelar Plan
        </button>
      )}

      {open && host && createPortal(
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="lbd-ad-scrim lbd-sb-scrim"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-management-title"
            className="lbd-sb-dialog"
          >
            <div className="lbd-sb-dialog-head">
              <div>
                <h2 id="plan-management-title" className="lbd-display">
                  Gestionar plan
                </h2>
                <p>
                  Plan actual: {PLAN_LABELS[currentPlan]}. La solicitud se procesa por WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="lbd-ad-ico"
              >
                ×
              </button>
            </div>

            {isPending && <p className="lbd-sb-hint">Generando enlaces…</p>}
            {error && <p className="lbd-modal-error">{error}</p>}
            {links && (
              <div className="lbd-sb-links">
                <span className="lbd-mono">CAMBIAR DE PLAN</span>
                <div>
                  {availablePlans.map((plan) => (
                    <a
                      key={plan}
                      href={links.changeByPlan[plan]}
                      target="_blank"
                      rel="noreferrer"
                      className={`lbd-btn ${plan === suggestedPlan ? "lbd-btn--solid" : "lbd-btn--ghost"}`}
                    >
                      Cambiar a {PLAN_LABELS[plan]}
                    </a>
                  ))}
                </div>

                <div className="lbd-sb-links-cancel">
                  <a
                    href={links.cancel}
                    target="_blank"
                    rel="noreferrer"
                    className="lbd-btn lbd-btn--ghost lbd-sb-danger"
                  >
                    Cancelar plan
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>,
        host
      )}
    </>
  );
}
