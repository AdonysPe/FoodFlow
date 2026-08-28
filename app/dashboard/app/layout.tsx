import type { ReactNode } from "react";
import MotionProvider from "@/components/MotionProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Toast from "@/components/dashboard/Toast";
import GlassCard from "@/components/ui/GlassCard";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { logout } from "@/lib/actions/auth";

const CLIENT_TITLES: Record<string, string> = {
  overview: "Resumen",
  orders: "Pedidos",
  kitchen: "Cocina",
  mesas: "Mesas",
  menu: "Menú",
  customers: "Clientes",
  analytics: "Análisis",
};

export default async function ClientAppLayout({ children }: { children: ReactNode }) {
  const { user, restaurant } = await requireClientRestaurant();

  if (!restaurant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-16">
        <GlassCard className="w-full max-w-md p-8 text-center" hoverLift={false}>
          <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/50">
            {user.email}
          </span>
          <h1 className="mt-5 font-display text-[1.4rem] font-bold tracking-[-0.02em] text-white">
            No restaurant linked yet
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/50">
            Your account isn&apos;t connected to a restaurant. The FoodFlow team will reach out once
            your restaurant is set up.
          </p>
          <form action={logout} className="mt-7">
            <button
              type="submit"
              className="text-[13.5px] font-medium text-white/40 hover:text-white/70"
            >
              Log out
            </button>
          </form>
        </GlassCard>
      </main>
    );
  }

  return (
    <MotionProvider>
      <div className="min-h-screen bg-ink-950">
        <Sidebar userEmail={user.email} variant="client" badgeLabel={restaurant.name} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar titles={CLIENT_TITLES} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
        <Toast />
      </div>
    </MotionProvider>
  );
}
