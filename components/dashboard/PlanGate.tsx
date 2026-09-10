"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { IconCheck, IconShield, IconX } from "@/components/ui/Icons";
import { getPlanManagementLinks } from "@/lib/actions/restaurants";
import {
  FEATURE_LABELS,
  FEATURE_PITCHES,
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_TAGLINES,
  firstPlanWith,
  type FeatureValue,
  type PlanValue,
} from "@/lib/plans";

type ManagementLinks = { change: string; cancel: string };

export default function PlanGate({
  feature,
  plan,
}: {
  feature: FeatureValue;
  plan: PlanValue;
}) {
  const needed = firstPlanWith(feature);
  const label = FEATURE_LABELS[feature];
  const alsoUnlocks = PLAN_FEATURES[needed]
    .filter((item) => item !== feature && !PLAN_FEATURES[plan].includes(item))
    .map((item) => FEATURE_LABELS[item]);
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ManagementLinks | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openPlanModal() {
    setOpen(true);
    setError("");
    if (links) return;

    startTransition(async () => {
      const result = await getPlanManagementLinks(needed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinks(result.data);
    });
  }

  return (
    <>
      <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center sm:py-16">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fg/[0.1] bg-fg/[0.04] text-faint">
          <IconShield className="h-5 w-5" />
        </span>

        <h1 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
          {label} viene con el plan {PLAN_LABELS[needed]}
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
          {FEATURE_PITCHES[feature]}
        </p>

        <GlassCard className="mt-7 w-full p-5 text-left sm:p-6" hoverLift={false}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-fg/90">
                Plan {PLAN_LABELS[needed]}
              </p>
              <p className="mt-0.5 text-[12.5px] text-faint">
                {PLAN_TAGLINES[needed]}
              </p>
            </div>
            <p className="shrink-0 font-display text-[20px] font-extrabold text-fg">
              {PLAN_PRICES[needed]}
              <span className="text-[13px] font-medium text-faint">/mes</span>
            </p>
          </div>

          {alsoUnlocks.length > 0 && (
            <>
              <p className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-faint">
                También se abre
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {alsoUnlocks.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-[13.5px] text-fg/70">
                    <IconCheck className="h-3.5 w-3.5 shrink-0 text-accent-icon" />
                    {name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassCard>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={openPlanModal}
            className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent transition-opacity hover:opacity-90"
          >
            Cambiar o Cancelar Plan
          </button>
          <Link
            href="/dashboard/app/overview"
            className="rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-5 py-2.5 text-[14px] font-medium text-fg/70 transition-colors hover:bg-fg/[0.08] hover:text-fg"
          >
            Volver al resumen
          </Link>
        </div>

        <p className="mt-5 text-[12px] text-faint">
          Tu plan actual es {PLAN_LABELS[plan]}.
        </p>
      </div>

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
            aria-labelledby="plan-modal-title"
            className="w-full max-w-md rounded-2xl border border-fg/[0.1] bg-ink-900 p-5 shadow-panel sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="plan-modal-title" className="font-display text-[19px] font-bold text-fg">
                  Gestionar plan
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  El equipo de FoodFlow procesará la solicitud manualmente por WhatsApp.
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
              <div className="mt-6 grid gap-3">
                <a
                  href={links.change}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-3 text-center text-[14px] font-semibold text-on-accent"
                >
                  Cambiar al plan {PLAN_LABELS[needed]}
                </a>
                <a
                  href={links.cancel}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-fg/[0.12] bg-fg/[0.04] px-4 py-3 text-center text-[14px] font-semibold text-fg/75 hover:bg-fg/[0.08]"
                >
                  Solicitar cancelación
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
