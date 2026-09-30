import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { type FeatureValue, type PlanValue } from "@/lib/plans";
import { restaurantEntitlement } from "@/lib/subscriptions/access";
import { entitlementAllows } from "@/lib/subscriptions/entitlement";

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
