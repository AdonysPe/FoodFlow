import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  redirect(user.role === "admin" ? "/dashboard/admin/overview" : "/dashboard/app/overview");
}
