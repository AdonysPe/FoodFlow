import Link from "next/link";
import PlanManagementButton from "@/components/dashboard/PlanManagementButton";
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

/**
 * What a module shows when the restaurant's plan does not include it, design
 * B: the lock, what the module is for, the plan that opens it and what else
 * that plan brings.
 */
export default function PlanGate({ feature, plan }: { feature: FeatureValue; plan: PlanValue }) {
  const needed = firstPlanWith(feature);
  const label = FEATURE_LABELS[feature];
  const alsoUnlocks = PLAN_FEATURES[needed]
    .filter((item) => item !== feature && !PLAN_FEATURES[plan].includes(item))
    .map((item) => FEATURE_LABELS[item]);

  return (
    <div className="lbd-gate lbd-pop">
      <span className="lbd-gate-lock" aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 11h14v9.5H5zM8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>

      <h1 className="lbd-display lbd-gate-h">
        {label} viene con el plan {PLAN_LABELS[needed]}
      </h1>
      <p className="lbd-gate-p">{FEATURE_PITCHES[feature]}</p>

      <div className="lbd-gate-plan">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <strong>Plan {PLAN_LABELS[needed]}</strong>
            <small>{PLAN_TAGLINES[needed]}</small>
          </div>
          <span className="lbd-display lbd-gate-price">
            {PLAN_PRICES[needed]}
            <small>/mes</small>
          </span>
        </div>

        {alsoUnlocks.length > 0 && (
          <>
            <span className="lbd-cm-eyebrow">También se abre</span>
            <ul>
              {alsoUnlocks.map((name) => (
                <li key={name}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff5a33" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {name}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        <PlanManagementButton currentPlan={plan} suggestedPlan={needed} />
        <Link href="/dashboard/app/overview" className="lbd-btn lbd-btn--ghost">
          Volver al resumen
        </Link>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "#8a8278" }}>Tu plan actual es {PLAN_LABELS[plan]}.</p>
    </div>
  );
}
