import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { IconCheck, IconShield } from "@/components/ui/Icons";
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

const WHATSAPP = "https://wa.me/51950360685";

// Shown in place of a module the restaurant's plan doesn't include. It names
// what the module does and which plan opens it — never a bare "no access".
export default function PlanGate({
  feature,
  plan,
}: {
  feature: FeatureValue;
  plan: PlanValue;
}) {
  const needed = firstPlanWith(feature);
  const label = FEATURE_LABELS[feature];
  // What else the upgrade brings along, beyond the module they just hit.
  const alsoUnlocks = PLAN_FEATURES[needed]
    .filter((f) => f !== feature && !PLAN_FEATURES[plan].includes(f))
    .map((f) => FEATURE_LABELS[f]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center sm:py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white/35">
        <IconShield className="h-5 w-5" />
      </span>

      <h1 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-white">
        {label} viene con el plan {PLAN_LABELS[needed]}
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-white/50">
        {FEATURE_PITCHES[feature]}
      </p>

      <GlassCard className="mt-7 w-full p-5 text-left sm:p-6" hoverLift={false}>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white/90">
              Plan {PLAN_LABELS[needed]}
            </p>
            <p className="mt-0.5 text-[12.5px] text-white/40">{PLAN_TAGLINES[needed]}</p>
          </div>
          <p className="shrink-0 font-display text-[20px] font-extrabold text-white">
            {PLAN_PRICES[needed]}
            <span className="text-[13px] font-medium text-white/40">/mes</span>
          </p>
        </div>

        {alsoUnlocks.length > 0 && (
          <>
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-white/35">
              También se abre
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {alsoUnlocks.map((name) => (
                <li key={name} className="flex items-center gap-2 text-[13.5px] text-white/70">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-accent-400" />
                  {name}
                </li>
              ))}
            </ul>
          </>
        )}
      </GlassCard>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-ink-950 transition-opacity hover:opacity-90"
        >
          Hablar para subir de plan
        </a>
        <Link
          href="/dashboard/app/overview"
          className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-[14px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          Volver al resumen
        </Link>
      </div>

      <p className="mt-5 text-[12px] text-white/30">
        Tu plan actual es {PLAN_LABELS[plan]}.
      </p>
    </div>
  );
}
