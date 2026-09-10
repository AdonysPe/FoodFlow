"use client";

import { useEffect, useState, useTransition } from "react";
import { IconX } from "@/components/ui/Icons";
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
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
          <button
            type="button"
            onClick={openModal}
            className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent transition-opacity hover:opacity-90"
          >
            Cambiar plan
          </button>
          <button
            type="button"
            onClick={openModal}
            className="rounded-xl border border-accent-400/30 bg-accent-400/[0.08] px-5 py-2.5 text-[14px] font-semibold text-accent-label hover:bg-accent-400/[0.14]"
          >
            Cancelar plan
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={`rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent transition-opacity hover:opacity-90 ${className}`}
        >
          Cambiar o Cancelar Plan
        </button>
      )}

      {open && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-management-title"
            className="w-full max-w-md rounded-2xl border border-fg/[0.1] bg-ink-900 p-5 shadow-panel sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="plan-management-title"
                  className="font-display text-[19px] font-bold text-fg"
                >
                  Gestionar plan
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Plan actual: {PLAN_LABELS[currentPlan]}. La solicitud se procesa por WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-muted hover:bg-fg/[0.06] hover:text-fg"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            {isPending && <p className="mt-6 text-[13px] text-faint">Generando enlaces…</p>}
            {error && <p className="mt-6 text-[13px] text-accent-label">{error}</p>}
            {links && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  Cambiar de plan
                </p>
                <div className="mt-2 grid gap-2">
                  {availablePlans.map((plan) => (
                    <a
                      key={plan}
                      href={links.changeByPlan[plan]}
                      target="_blank"
                      rel="noreferrer"
                      className={
                        plan === suggestedPlan
                          ? "rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-3 text-center text-[14px] font-semibold text-on-accent"
                          : "rounded-xl border border-fg/[0.12] bg-fg/[0.04] px-4 py-3 text-center text-[14px] font-semibold text-fg/75 hover:bg-fg/[0.08]"
                      }
                    >
                      Cambiar a {PLAN_LABELS[plan]}
                    </a>
                  ))}
                </div>

                <div className="mt-5 border-t border-fg/[0.08] pt-5">
                  <a
                    href={links.cancel}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-accent-400/30 bg-accent-400/[0.08] px-4 py-3 text-center text-[14px] font-semibold text-accent-label hover:bg-accent-400/[0.14]"
                  >
                    Cancelar plan
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
