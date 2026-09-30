// Subscription settings read from the environment.
//
// FAILS CLOSED, like lib/api/cron.ts. Checkout is off unless
// SUBSCRIPTIONS_ENABLED is "true", and even then it refuses to run with a
// missing key, a public/secret key pair from different modes, a plan id from
// the other mode, or live keys without the separate SUBSCRIPTIONS_ALLOW_LIVE
// switch. A deploy that cannot charge is better than one that charges wrong.
//
// Server only: reads secrets. Never import from a client component.

import type { PlanValue } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

export type ProviderMode = "test" | "live";

export type CulqiConfig = {
  mode: ProviderMode;
  secretKey: string;
  publicKey: string;
  /** Plan ids at Culqi, per plan, with and without the free trial. */
  planIds: Record<PlanValue, { regular: string; trial: string }>;
};

export type ConfigResult =
  | { ok: true; config: CulqiConfig }
  | { ok: false; reason: "disabled" }
  | { ok: false; reason: "misconfigured"; problems: string[] };

/** Card checkout switched on for this deploy. */
export function subscriptionsEnabled(): boolean {
  return process.env.SUBSCRIPTIONS_ENABLED?.trim() === "true";
}

const env = (name: string) => process.env[name]?.trim() ?? "";

function modeOf(value: string, prefix: "sk" | "pk" | "pln"): ProviderMode | null {
  if (value.startsWith(`${prefix}_test_`)) return "test";
  if (value.startsWith(`${prefix}_live_`)) return "live";
  return null;
}

export function readCulqiConfig(): ConfigResult {
  if (!subscriptionsEnabled()) return { ok: false, reason: "disabled" };

  const problems: string[] = [];
  const secretKey = env("CULQI_SECRET_KEY");
  const publicKey = env("CULQI_PUBLIC_KEY");
  const secretMode = modeOf(secretKey, "sk");
  const publicMode = modeOf(publicKey, "pk");

  if (!secretMode) problems.push("CULQI_SECRET_KEY ausente o sin prefijo sk_test_/sk_live_");
  if (!publicMode) problems.push("CULQI_PUBLIC_KEY ausente o sin prefijo pk_test_/pk_live_");
  if (secretMode && publicMode && secretMode !== publicMode) {
    problems.push("CULQI_SECRET_KEY y CULQI_PUBLIC_KEY son de modos distintos (test/live)");
  }
  const mode = secretMode ?? "test";
  if (mode === "live" && env("SUBSCRIPTIONS_ALLOW_LIVE") !== "true") {
    problems.push("Llaves live sin SUBSCRIPTIONS_ALLOW_LIVE=true");
  }

  const planIds = {} as CulqiConfig["planIds"];
  for (const plan of PLANS) {
    const upper = plan.toUpperCase();
    const regular = env(`CULQI_PLAN_${upper}`);
    const trial = env(`CULQI_PLAN_${upper}_TRIAL`);
    for (const [name, value] of [
      [`CULQI_PLAN_${upper}`, regular],
      [`CULQI_PLAN_${upper}_TRIAL`, trial],
    ] as const) {
      // Culqi ids are 25 characters: "pln_test_" / "pln_live_" + 16.
      if (!/^pln_(test|live)_[A-Za-z0-9]{16}$/.test(value)) {
        problems.push(`${name} ausente o con formato inválido`);
      } else if (modeOf(value, "pln") !== mode) {
        problems.push(`${name} es de otro modo que las llaves`);
      }
    }
    planIds[plan] = { regular, trial };
  }

  if (problems.length > 0) return { ok: false, reason: "misconfigured", problems };
  return { ok: true, config: { mode, secretKey, publicKey, planIds } };
}
