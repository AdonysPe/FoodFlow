import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { planAllows, type FeatureValue, type PlanValue } from "@/lib/plans";

// Resolves the signed-in owner's restaurant and checks the plan in one call.
// A page renders the upsell screen when `allowed` is false — the module is
// never reachable by typing the URL, which is the point of gating it.
export async function requirePlanFeature(feature: FeatureValue) {
  const { user, restaurant } = await requireClientRestaurant();
  const plan = (restaurant?.plan ?? "carta") as PlanValue;
  return {
    user,
    restaurant,
    plan,
    allowed: restaurant != null && planAllows(plan, feature),
  };
}
