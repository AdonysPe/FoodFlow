import { getKitchenOrders } from "@/lib/actions/orders";
import KitchenBoard from "@/components/dashboard/KitchenBoard";

export const metadata = {
  title: "Cocina",
};

export default async function KitchenPage() {
  const orders = await getKitchenOrders();

  return <KitchenBoard initialOrders={orders} />;
}
