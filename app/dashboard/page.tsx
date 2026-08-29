import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "admin") redirect("/dashboard/admin/overview");
  if (user.role === "mozo") redirect("/dashboard/comanda");
  redirect("/dashboard/app/overview");
}
