import type { ReactNode } from "react";
import MotionProvider from "@/components/MotionProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Toast from "@/components/dashboard/Toast";
import { panelFontClasses } from "@/components/dashboard/fonts";
import type { RestaurantOption } from "@/components/dashboard/RestaurantSwitcher";
import type { PlanValue } from "@/lib/plans";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Plataforma",
  restaurant_owner: "Dueño",
  restaurant_admin: "Administrador",
  restaurant_staff: "Equipo",
};

/**
 * The frame of every panel screen (the client dashboard and the platform
 * admin), design B ("Noche"): the floating glass sidebar, the strip above the
 * content and the room the screen sits in. The panel is pinned to the night
 * theme, like the public pages, so what is inside it — every screen not yet
 * redrawn included — reads on the same dark ground.
 */
export default function DashboardShell({
  children,
  titles,
  home,
  userEmail,
  role,
  variant,
  badgeLabel,
  plan,
  restaurants,
  activeRestaurantId,
}: {
  children: ReactNode;
  titles?: Record<string, string>;
  home?: string;
  userEmail: string;
  role: string;
  variant?: "admin" | "client";
  badgeLabel?: string;
  plan?: PlanValue;
  restaurants?: RestaurantOption[];
  activeRestaurantId?: string;
}) {
  return (
    <MotionProvider>
      <div data-theme="dark" className={`${panelFontClasses} lbd`}>
        <div className="lbd-glow" aria-hidden />
        <Sidebar
          userEmail={userEmail}
          roleLabel={ROLE_LABELS[role]}
          variant={variant}
          badgeLabel={badgeLabel}
          plan={plan}
          restaurants={restaurants}
          activeRestaurantId={activeRestaurantId}
        />
        <div className="lbd-wrap">
          <Topbar titles={titles} home={home} />
          <main className="lbd-content">{children}</main>
        </div>
        <Toast />
      </div>
    </MotionProvider>
  );
}
