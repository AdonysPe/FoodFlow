// Subscription settings read from the environment.
//
// FAILS CLOSED, like lib/api/cron.ts. Two levels:
//
//   readCulqiKeys()   — enough to TALK to Culqi: process webhooks, renewals,
//                       cancellations. Independent of SUBSCRIPTIONS_ENABLED:
//                       switching new checkouts off must not strand the venues
//                       that are already paying.
//   readCulqiConfig() — enough to SELL: keys + SUBSCRIPTIONS_ENABLED + the six
//                       plan ids.
//
// Both refuse a missing key, a public/secret pair from different modes, and
// live keys without the separate SUBSCRIPTIONS_ALLOW_LIVE switch.
//
// Server only: reads secrets. Never import from a client component.

import type { PlanValue } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { foodflowRuc } from "@/lib/subscriptions/ruc";

export type ProviderMode = "test" | "live";

export type CulqiKeys = {
  mode: ProviderMode;
  secretKey: string;
  publicKey: string;
};

export type CulqiConfig = CulqiKeys & {
  /** Plan ids at Culqi, per plan, with and without the free trial. */
  planIds: Record<PlanValue, { regular: string; trial: string }>;
};

export type KeysResult =
  | { ok: true; keys: CulqiKeys }
  | { ok: false; reason: "absent" }
  | { ok: false; reason: "misconfigured"; problems: string[] };

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

export function readCulqiKeys(): KeysResult {
  const secretKey = env("CULQI_SECRET_KEY");
  const publicKey = env("CULQI_PUBLIC_KEY");
  if (!secretKey && !publicKey) return { ok: false, reason: "absent" };

  const problems: string[] = [];
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
  // Real money needs a real taxpayer behind it. Every payment must be
  // answered with a boleta or factura issued by FoodFlow's own RUC, so live
  // mode refuses to start until that RUC is configured and valid. (Test mode
  // does not need it: nothing is charged.)
  if (mode === "live" && !foodflowRuc()) {
    problems.push("Llaves live sin el RUC de FoodFlow (NEXT_PUBLIC_LEGAL_TAX_ID válido)");
  }
  // Sandbox and production stay apart even if a variable is scoped wrongly in
  // Vercel: real keys are refused on a Preview or Development deployment, so
  // a preview URL can never take a real card. (VERCEL_ENV is unset locally,
  // where ALLOW_LIVE alone decides.)
  const vercelEnv = env("VERCEL_ENV");
  if (mode === "live" && vercelEnv && vercelEnv !== "production") {
    problems.push(`Llaves live en un despliegue ${vercelEnv}: solo se aceptan en producción`);
  }

  if (problems.length > 0) return { ok: false, reason: "misconfigured", problems };
  return { ok: true, keys: { mode, secretKey, publicKey } };
}

/**
 * @param requireEnabled false only for work on subscriptions that already
 *   exist (a scheduled downgrade reaching its date): that must happen even
 *   while new checkouts are switched off.
 */
export function readCulqiConfig({ requireEnabled = true }: { requireEnabled?: boolean } = {}): ConfigResult {
  if (requireEnabled && !subscriptionsEnabled()) return { ok: false, reason: "disabled" };

  const keys = readCulqiKeys();
  const problems: string[] =
    keys.ok ? [] : keys.reason === "absent" ? ["CULQI_SECRET_KEY y CULQI_PUBLIC_KEY ausentes"] : keys.problems;
  const mode = keys.ok ? keys.keys.mode : modeOf(env("CULQI_SECRET_KEY"), "sk") ?? "test";

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

  if (problems.length > 0 || !keys.ok) return { ok: false, reason: "misconfigured", problems };
  return { ok: true, config: { ...keys.keys, planIds } };
}

/**
 * Shared secret Culqi must present on every webhook delivery. Culqi does not
 * publish a signature scheme for its webhooks, so this authenticates the
 * caller and the event is then re-read from Culqi's API before anything is
 * trusted (lib/subscriptions/webhooks.ts). At least 32 characters.
 */
export function readWebhookSecret(): string | null {
  const secret = env("CULQI_WEBHOOK_SECRET");
  return secret.length >= 32 ? secret : null;
}
