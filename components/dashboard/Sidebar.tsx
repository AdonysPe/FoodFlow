"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconDashboard,
  IconOrders,
  IconKitchen,
  IconMenuBook,
  IconUsers,
  IconStore,
  IconAnalytics,
  IconTables,
  IconLogout,
  IconX,
} from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { logout } from "@/lib/actions/auth";
import { EASE } from "@/lib/motion";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

// Icon components can't cross the server→client boundary as props (RSC
// can't serialize function references), so each variant's nav items —
// icons included — are defined here, inside the client module.
const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/admin/overview", label: "Overview", icon: IconDashboard },
  { href: "/dashboard/admin/leads", label: "Leads", icon: IconUsers },
  { href: "/dashboard/admin/restaurants", label: "Restaurants", icon: IconStore },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: IconAnalytics },
];

const CLIENT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/app/overview", label: "Resumen", icon: IconDashboard },
  { href: "/dashboard/app/orders", label: "Pedidos", icon: IconOrders },
  { href: "/dashboard/app/kitchen", label: "Cocina", icon: IconKitchen },
  { href: "/dashboard/app/mesas", label: "Mesas", icon: IconTables },
  { href: "/dashboard/app/menu", label: "Menú", icon: IconMenuBook },
  { href: "/dashboard/app/customers", label: "Clientes", icon: IconUsers },
  { href: "/dashboard/app/analytics", label: "Análisis", icon: IconAnalytics },
];

function NavList({
  pathname,
  navItems,
  onNavigate,
}: {
  pathname: string;
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors duration-200 ${
              active
                ? "bg-white/[0.07] text-white"
                : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                active ? "text-accent-400" : "text-white/35 group-hover:text-white/60"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({
  userEmail,
  variant = "admin",
  badgeLabel = "Admin",
}: {
  userEmail: string;
  variant?: "admin" | "client";
  badgeLabel?: string;
}) {
  const navItems = variant === "client" ? CLIENT_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const pathname = usePathname();
  const router = useRouter();
  const sidebarOpen = useDashboardStore((s) => s.sidebarOpen);
  const closeSidebar = useDashboardStore((s) => s.closeSidebar);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const brand = (
    <div className="flex items-center gap-2 px-5 pt-6 pb-5">
      <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-gradient-accent">
        FoodFlow
      </span>
      <span className="truncate rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
        {badgeLabel}
      </span>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-white/[0.07] p-3">
      <div className="flex items-center gap-2 rounded-xl px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-400 to-accent-600 text-[13px] font-bold text-ink-950">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white/85">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="shrink-0 rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <IconLogout className="h-[17px] w-[17px]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-ink-950/70 backdrop-blur-xl lg:flex">
        {brand}
        <NavList pathname={pathname} navItems={navItems} />
        {footer}
      </aside>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={closeSidebar}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.08] bg-ink-950 lg:hidden"
            >
              <div className="flex items-center justify-between">
                {brand}
                <button
                  type="button"
                  onClick={closeSidebar}
                  aria-label="Close menu"
                  className="mr-4 rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
              <NavList pathname={pathname} navItems={navItems} onNavigate={closeSidebar} />
              {footer}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
