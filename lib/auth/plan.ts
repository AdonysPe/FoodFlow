import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { FEATURE_LABELS, type FeatureValue, type PlanValue } from "@/lib/plans";
import { restaurantEntitlement, type EntitlementColumns } from "@/lib/subscriptions/access";
import { entitlementAllows } from "@/lib/subscriptions/entitlement";

// The same decision the pages make, for the code a page cannot protect: a
// Server Action is a POST endpoint of its own and a billing route is a plain
// fetch, so neither is stopped by the page that happens to render the upsell.
// Returns the sentence to show when the venue may not use `feature` (the plan
// does not include it, or the billing state is locked) and null when it may.
// Actions turn it into `{ ok: false, error }`; routes into a 403.
export function featureRefusal(
  restaurant: EntitlementColumns,
  feature: FeatureValue
): string | null {
  const entitlement = restaurantEntitlement(restaurant);
  if (entitlementAllows(entitlement, feature)) return null;
  const label = FEATURE_LABELS[feature];
  return entitlement.mode === "locked"
    ? `El acceso a ${label} está pausado: revisa el estado de cobro del restaurante.`
    : `Tu plan no incluye ${label}.`;
}

// Resolves the signed-in owner's restaurant and checks the plan in one call.
// A page renders the upsell screen when `allowed` is false — the module is
// never reachable by typing the URL, which is the point of gating it.
//
// `allowed` weighs the billing state too (lib/subscriptions/entitlement.ts):
// an unpaid or suspended venue is refused even on a plan that includes the
// module. `entitlement.mode === "locked"` tells that case apart from "your
// plan does not include this", which is what `plan` alone answers.
export async function requirePlanFeature(feature: FeatureValue) {
  const { user, restaurant } = await requireClientRestaurant();
  const plan = (restaurant?.plan ?? "carta") as PlanValue;
  const entitlement = restaurant ? restaurantEntitlement(restaurant) : null;
  return {
    user,
    restaurant,
    plan,
    entitlement,
    allowed: entitlement != null && entitlementAllows(entitlement, feature),
  };
}
