import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import CustomersTable, { type CustomerRow } from "@/components/dashboard/CustomersTable";
import PlanGate from "@/components/dashboard/PlanGate";

export const metadata = {
  title: "Clientes",
};

export default async function CustomersPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("customers");
  if (!allowed) return <PlanGate feature="customers" plan={plan} />;
  if (!restaurant) return null;

  const [customers, orderStats] = await Promise.all([
    prisma.customer.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["customerName"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const statsByName = new Map(orderStats.map((s) => [s.customerName.toLowerCase(), s]));

  const rows: CustomerRow[] = customers
    .map((c) => {
      const stats = statsByName.get(c.name.toLowerCase());
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        ordersCount: stats?._count.id ?? 0,
        totalSpent: stats?._sum.total ?? 0,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return <CustomersTable customers={rows} />;
}
