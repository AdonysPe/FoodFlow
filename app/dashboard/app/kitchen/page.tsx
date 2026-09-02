import { getKitchenOrders } from "@/lib/actions/orders";
import { requirePlanFeature } from "@/lib/auth/plan";
import KitchenBoard from "@/components/dashboard/KitchenBoard";
import PlanGate from "@/components/dashboard/PlanGate";

export const metadata = {
  title: "Cocina",
};

export default async function KitchenPage() {
  const { plan, allowed } = await requirePlanFeature("kitchen");
  if (!allowed) return <PlanGate feature="kitchen" plan={plan} />;

  const orders = await getKitchenOrders();

  return <KitchenBoard initialOrders={orders} />;
}
