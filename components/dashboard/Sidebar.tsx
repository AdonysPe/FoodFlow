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
  IconMail,
  IconStore,
  IconAnalytics,
  IconTables,
  IconStaff,
  IconReceipt,
  IconShield,
  IconLock,
  IconLogout,
  IconX,
} from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { logout } from "@/lib/actions/auth";
import { EASE } from "@/lib/motion";
import {
  PLANS,
  PLAN_FEATURES,
  PLAN_LABELS,
  firstPlanWith,
  type FeatureValue,
  type PlanValue,
} from "@/lib/plans";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  // Client nav only: which plan feature opens this module.
  feature?: FeatureValue;
};

// Icon components can't cross the server→client boundary as props (RSC
// can't serialize function references), so each variant's nav items —
// icons included — are defined here, inside the client module.
const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/admin/overview", label: "Overview", icon: IconDashboard },
  { href: "/dashboard/admin/leads", label: "Leads", icon: IconUsers },
  { href: "/dashboard/admin/contactos", label: "Contactos", icon: IconMail },
  { href: "/dashboard/admin/restaurants", label: "Restaurants", icon: IconStore },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: IconAnalytics },
  { href: "/dashboard/admin/audit", label: "Audit log", icon: IconShield },
];

const CLIENT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/app/overview", label: "Resumen", icon: IconDashboard, feature: "overview" },
  { href: "/dashboard/comanda", label: "Comanda", icon: IconReceipt, feature: "comanda" },
  { href: "/dashboard/app/orders", label: "Pedidos", icon: IconOrders, feature: "orders" },
  { href: "/dashboard/app/kitchen", label: "Cocina", icon: IconKitchen, feature: "kitchen" },
  { href: "/dashboard/app/mesas", label: "Mesas", icon: IconTables, feature: "tables" },
  { href: "/dashboard/app/menu", label: "Menú", icon: IconMenuBook, feature: "menu" },
  { href: "/dashboard/app/customers", label: "Clientes", icon: IconUsers, feature: "customers" },
  { href: "/dashboard/app/equipo", label: "Equipo", icon: IconStaff, feature: "staff" },
  { href: "/dashboard/app/analytics", label: "Análisis", icon: IconAnalytics, feature: "analytics" },
];

function NavList({
  pathname,
  navItems,
  plan,
  onNavigate,
}: {
  pathname: string;
  navItems: NavItem[];
  // Undefined for the admin sidebar, which has no plan gating.
  plan?: PlanValue;
  onNavigate?: () => void;
}) {
  const included = plan
    ? navItems.filter((i) => !i.feature || PLAN_FEATURES[plan].includes(i.feature))
    : navItems;
  // Locked modules stay visible but muted, grouped under the plan that opens
  // each one — so "Análisis" never sits under a "Servicio" heading.
  const locked = plan
    ? navItems.filter((i) => i.feature && !PLAN_FEATURES[plan].includes(i.feature))
    : [];
  const lockedByPlan = PLANS.map(
    (p) => [p, locked.filter((i) => firstPlanWith(i.feature!) === p)] as const
  ).filter(([, items]) => items.length > 0);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      {included.map((item) => {
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

      {lockedByPlan.map(([neededPlan, items]) => (
        <div key={neededPlan}>
          <p className="mt-5 px-3.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-white/25">
            Con el plan {PLAN_LABELS[neededPlan]}
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-white/25 transition-colors duration-200 hover:bg-white/[0.03] hover:text-white/45"
              >
                <Icon className="h-[17px] w-[17px] shrink-0 text-white/20" />
                {item.label}
                <IconLock className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20" />
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar({
  userEmail,
  variant = "admin",
  badgeLabel = "Admin",
  plan,
}: {
  userEmail: string;
  variant?: "admin" | "client";
  badgeLabel?: string;
  plan?: PlanValue;
}) {
  const navItems = variant === "client" ? CLIENT_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const navPlan = variant === "client" ? plan : undefined;
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
        <NavList pathname={pathname} navItems={navItems} plan={navPlan} />
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
              <NavList
                pathname={pathname}
                navItems={navItems}
                plan={navPlan}
                onNavigate={closeSidebar}
              />
              {footer}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
