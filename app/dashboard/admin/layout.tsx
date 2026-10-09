import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPlatformAdmin } from "@/lib/auth/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // The gate for every /dashboard/admin page. A tenant that types the URL
  // lands on the login screen and is told nothing about what is behind it.
  if (!user || !isPlatformAdmin(user.role)) redirect("/login");

  return (
    <DashboardShell userEmail={user.email} role={user.role} home="/dashboard/admin/overview">
      {children}
    </DashboardShell>
  );
}
