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
  IconGlobe,
  IconUsers,
  IconMail,
  IconStore,
  IconAnalytics,
  IconTables,
  IconStaff,
  IconReceipt,
  IconPrinter,
  IconShield,
  IconLock,
  IconLogout,
  IconX,
} from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { logout } from "@/lib/actions/auth";
import { EASE } from "@/lib/motion";
import RestaurantSwitcher, {
  type RestaurantOption,
} from "@/components/dashboard/RestaurantSwitcher";
import ExportDataButton from "@/components/dashboard/ExportDataButton";
import BillingStatusBadge, {
  type BillingStatusValue,
} from "@/components/dashboard/BillingStatusBadge";
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

export type NavSection = {
  /** Null on the opening group, which is the home and needs no heading. */
  title: string | null;
  items: NavItem[];
};

// Icon components can't cross the server→client boundary as props (RSC
// can't serialize function references), so each variant's nav items —
// icons included — are defined here, inside the client module.
const ADMIN_NAV: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/dashboard/admin/overview", label: "Overview", icon: IconDashboard },
      { href: "/dashboard/admin/leads", label: "Leads", icon: IconUsers },
      { href: "/dashboard/admin/contactos", label: "Contactos", icon: IconMail },
      { href: "/dashboard/admin/restaurants", label: "Restaurants", icon: IconStore },
      { href: "/dashboard/admin/analytics", label: "Analytics", icon: IconAnalytics },
      { href: "/dashboard/admin/audit", label: "Audit log", icon: IconShield },
    ],
  },
];

/**
 * The client nav, grouped the way a restaurant actually thinks about its day.
 *
 * Order inside each group follows the shift, not the alphabet: a waiter opens
 * the comanda, seats people on the floor plan, the kitchen cooks, and the
 * orders list is where it all ends up. "Configuración" is last because it is
 * set up once and then left alone — a flat list put Facturación next to Cocina
 * and gave a nightly screen the same weight as a yearly one.
 */
const CLIENT_NAV: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/dashboard/app/overview", label: "Resumen", icon: IconDashboard, feature: "overview" },
    ],
  },
  {
    title: "Servicio",
    items: [
      { href: "/dashboard/comanda", label: "Comanda", icon: IconReceipt, feature: "comanda" },
      { href: "/dashboard/app/mesas", label: "Mesas", icon: IconTables, feature: "tables" },
      { href: "/dashboard/app/kitchen", label: "Cocina", icon: IconKitchen, feature: "kitchen" },
      { href: "/dashboard/app/orders", label: "Pedidos", icon: IconOrders, feature: "orders" },
    ],
  },
  {
    title: "Carta",
    items: [
      { href: "/dashboard/app/menu", label: "Menú", icon: IconMenuBook, feature: "menu" },
      // The one screen the Carta plan is named after; it was reachable only
      // from inside Menú, which hid the plan's whole point.
      { href: "/dashboard/app/menu/carta", label: "Carta pública", icon: IconGlobe, feature: "menu" },
    ],
  },
  {
    title: "Negocio",
    items: [
      { href: "/dashboard/app/customers", label: "Clientes", icon: IconUsers, feature: "customers" },
      { href: "/dashboard/app/analytics", label: "Análisis", icon: IconAnalytics, feature: "analytics" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href: "/dashboard/app/equipo", label: "Equipo", icon: IconStaff, feature: "staff" },
      {
        href: "/dashboard/app/configuracion/facturacion",
        label: "Facturación",
        icon: IconPrinter,
        feature: "orders",
      },
    ],
  },
];

/**
 * Which item owns the current URL.
 *
 * Longest match wins, because the nav now contains nested routes: on
 * /dashboard/app/menu/carta a plain "startsWith" lights up both Menú and
 * Carta pública, and two active items read as a bug.
 */
function activeHref(sections: NavSection[], pathname: string): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const owns = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (owns && (best === null || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3.5 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  );
}

function NavList({
  pathname,
  sections,
  plan,
  onNavigate,
}: {
  pathname: string;
  sections: NavSection[];
  // Undefined for the admin sidebar, which has no plan gating.
  plan?: PlanValue;
  onNavigate?: () => void;
}) {
  const allowed = (item: NavItem) =>
    !plan || !item.feature || PLAN_FEATURES[plan].includes(item.feature);

  // A section whose every item is locked disappears entirely rather than
  // leaving a heading with nothing under it.
  const open = sections
    .map((section) => ({ ...section, items: section.items.filter(allowed) }))
    .filter((section) => section.items.length > 0);

  // Locked modules stay visible but muted, grouped under the plan that opens
  // each one — so "Análisis" never sits under a "Servicio" heading.
  const locked = plan
    ? sections.flatMap((section) => section.items).filter((item) => !allowed(item))
    : [];
  const lockedByPlan = PLANS.map(
    (p) => [p, locked.filter((i) => firstPlanWith(i.feature!) === p)] as const
  ).filter(([, items]) => items.length > 0);

  const current = activeHref(sections, pathname);

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
      {open.map((section, index) => (
        <div key={section.title ?? "inicio"} className="flex flex-col gap-1">
          {/* The first group opens the list, so it gets no heading and no
              leading gap; the rest are separated by their own label. */}
          {section.title && <SectionLabel>{section.title}</SectionLabel>}
          {!section.title && index > 0 && <span className="h-2" aria-hidden />}

          {section.items.map((item) => {
            const active = current === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors duration-200 ${
                  active
                    ? "bg-fg/[0.07] text-fg"
                    : "text-fg/70 hover:bg-fg/[0.05] hover:text-fg"
                }`}
              >
                {/* A rail on the active row. On paper the tinted fill alone is
                    a very light grey and reads as barely-there, so the accent
                    does the work of saying "you are here". */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400"
                  />
                )}
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                    active ? "text-accent-icon" : "text-faint group-hover:text-fg/80"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {lockedByPlan.map(([neededPlan, items]) => (
        <div key={neededPlan} className="flex flex-col gap-1">
          <SectionLabel>Con el plan {PLAN_LABELS[neededPlan]}</SectionLabel>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-faint transition-colors duration-200 hover:bg-fg/[0.04] hover:text-fg/80"
              >
                <Icon className="h-[17px] w-[17px] shrink-0 text-faint" />
                {item.label}
                <IconLock className="ml-auto h-3.5 w-3.5 shrink-0 text-faint" />
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
  restaurants = [],
  activeRestaurantId,
  billingStatus,
}: {
  userEmail: string;
  variant?: "admin" | "client";
  badgeLabel?: string;
  plan?: PlanValue;
  restaurants?: RestaurantOption[];
  activeRestaurantId?: string;
  billingStatus?: BillingStatusValue;
}) {
  const sections = variant === "client" ? CLIENT_NAV : ADMIN_NAV;
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
      {variant === "client" && activeRestaurantId ? (
        <RestaurantSwitcher
          restaurants={restaurants}
          activeRestaurantId={activeRestaurantId}
        />
      ) : (
        <span className="truncate rounded-full border border-fg/[0.1] bg-fg/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {badgeLabel}
        </span>
      )}
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-fg/[0.07] p-3">
      {variant === "client" && billingStatus && (
        <div className="mb-2 px-2.5">
          <BillingStatusBadge status={billingStatus} />
        </div>
      )}
      {variant === "client" && <ExportDataButton />}
      <div className="flex items-center gap-2 rounded-xl px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-400 to-accent-600 text-[13px] font-bold text-on-accent">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg/85">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          <IconLogout className="h-[17px] w-[17px]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-fg/[0.07] bg-ink-950/70 backdrop-blur-xl lg:flex">
        {brand}
        <NavList pathname={pathname} sections={sections} plan={navPlan} />
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
              className="fixed inset-0 z-40 bg-[var(--scrim)] backdrop-blur-sm lg:hidden"
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-fg/[0.08] bg-ink-950 lg:hidden"
            >
              <div className="flex items-center justify-between">
                {brand}
                <button
                  type="button"
                  onClick={closeSidebar}
                  aria-label="Close menu"
                  className="mr-4 rounded-lg p-2 text-muted hover:bg-fg/[0.06] hover:text-fg"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
              <NavList
                pathname={pathname}
                sections={sections}
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
