import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { logout } from "@/lib/actions/auth";
import type { PlanValue } from "@/lib/plans";
import { restaurantEntitlement } from "@/lib/subscriptions/access";

const CLIENT_TITLES: Record<string, string> = {
  "web-pedidos": "Web de pedidos",
  // The Resumen draws its own greeting, so the strip above it stays empty.
  overview: "",
  orders: "",
  kitchen: "",
  mesas: "",
  // The QR sheet is a page under /mesas; the topbar keys off the last
  // segment, so it needs its own entry or it falls back to "Dashboard".
  qr: "QR de mesas",
  // Same reason as the QR sheet: a settings page nested one level deeper.
  facturacion: "Facturación electrónica",
  // The public carta's settings, nested under /menu.
  carta: "",
  menu: "",
  customers: "Clientes",
  equipo: "Equipo",
  analytics: "Análisis",
  configuracion: "Configuración",
};

export default async function ClientAppLayout({ children }: { children: ReactNode }) {
  const { user, restaurant, restaurants } = await requireClientRestaurant();

  if (!restaurant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-16">
        <GlassCard className="w-full max-w-md p-8 text-center" hoverLift={false}>
          <span className="inline-flex items-center rounded-full border border-fg/[0.1] bg-fg/[0.04] px-3 py-1 text-[12px] font-medium text-muted">
            {user.email}
          </span>
          <h1 className="mt-5 font-display text-[1.4rem] font-bold tracking-[-0.02em] text-fg">
            Aún no hay un restaurante vinculado
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Tu cuenta todavía no está conectada a un restaurante. El equipo de FoodFlow te
            contactará en cuanto esté listo.
          </p>
          <form action={logout} className="mt-7">
            <button
              type="submit"
              className="text-[13.5px] font-medium text-faint hover:text-fg/70"
            >
              Cerrar sesión
            </button>
          </form>
        </GlassCard>
      </main>
    );
  }

  return (
    <DashboardShell
      titles={CLIENT_TITLES}
      home="/dashboard/app/overview"
      userEmail={user.email}
      role={user.role}
      variant="client"
      badgeLabel={restaurant.name}
      plan={(restaurantEntitlement(restaurant).effectivePlan ?? "carta") as PlanValue}
      restaurants={restaurants.map((item) => ({ id: item.id, name: item.name }))}
      activeRestaurantId={restaurant.id}
    >
      {children}
    </DashboardShell>
  );
}
