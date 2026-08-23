import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import MotionProvider from "@/components/MotionProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Toast from "@/components/dashboard/Toast";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  return (
    <MotionProvider>
      <div className="min-h-screen bg-ink-950">
        <Sidebar userEmail={user.email} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
        <Toast />
      </div>
    </MotionProvider>
  );
}
