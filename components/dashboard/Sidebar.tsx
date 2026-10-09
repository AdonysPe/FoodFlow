"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { logout } from "@/lib/actions/auth";
import { EASE } from "@/lib/motion";
import RestaurantSwitcher, {
  type RestaurantOption,
} from "@/components/dashboard/RestaurantSwitcher";
import { PLAN_FEATURES, PLAN_LABELS, type FeatureValue, type PlanValue } from "@/lib/plans";

export type NavItem = {
  href: string;
  label: string;
  /** The `d` of a 24×24 stroke icon (the prototype's own glyphs). */
  icon: string;
  // Client nav only: which plan feature opens this module.
  feature?: FeatureValue;
};

export type NavSection = {
  /** Null on the opening group, which is the home and needs no heading. */
  title: string | null;
  items: NavItem[];
};

// The prototype's icon set, one path per module.
const ICONS = {
  resumen: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  comanda: "M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8.5h6M9 12.5h6",
  mesas: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 3v2M12 19v2M3 12h2M19 12h2",
  cocina: "M5 11h14v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6zM9 7c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5",
  pedidos: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  menu: "M5 4.5h10a4 4 0 0 1 4 4v11H9a4 4 0 0 1-4-4zM9 9.5h6M9 13.5h4",
  carta: "M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17",
  web: "M3.5 5.5h17v13h-17zM3.5 9h17M6.5 7.2h.01M9 7.2h.01",
  clientes: "M12 5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5",
  analisis: "M4 19.5h16M7 16v-5M12 16V6M17 16v-3",
  equipo: "M9 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6M17 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15 15c2.5-.5 4.5.8 5.5 3.5",
  config: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  factura: "M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z",
  // Not in the prototype's client set; same stroke, for the admin nav.
  contactos: "M3 5.5h18v13H3zM3.5 7l8.5 6 8.5-6",
  locales: "M4 9l1.5-5h13L20 9M5 9v10h14V9M9 19v-5h6v5",
  auditoria: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
} as const;

// Icon paths are plain strings, so unlike components they could cross the
// server→client boundary; the nav still lives here, inside the client module.
const ADMIN_NAV: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/dashboard/admin/overview", label: "Overview", icon: ICONS.resumen },
      { href: "/dashboard/admin/leads", label: "Leads", icon: ICONS.clientes },
      { href: "/dashboard/admin/contactos", label: "Contactos", icon: ICONS.contactos },
      { href: "/dashboard/admin/restaurants", label: "Administración de restaurantes", icon: ICONS.locales },
      { href: "/dashboard/admin/analytics", label: "Analytics", icon: ICONS.analisis },
      { href: "/dashboard/admin/audit", label: "Audit log", icon: ICONS.auditoria },
    ],
  },
];

/**
 * The client nav, grouped the way a restaurant actually thinks about its day.
 *
 * Order inside each group follows the shift, not the alphabet: a waiter opens
 * the comanda, seats people on the floor plan, the kitchen cooks, and the
 * orders list is where it all ends up. "Configuración" is last because it is
 * set up once and then left alone.
 */
const CLIENT_NAV: NavSection[] = [
  {
    title: null,
    items: [{ href: "/dashboard/app/overview", label: "Resumen", icon: ICONS.resumen, feature: "overview" }],
  },
  {
    title: "Servicio",
    items: [
      { href: "/dashboard/comanda", label: "Comanda", icon: ICONS.comanda, feature: "comanda" },
      { href: "/dashboard/app/mesas", label: "Mesas", icon: ICONS.mesas, feature: "tables" },
      { href: "/dashboard/app/kitchen", label: "Cocina", icon: ICONS.cocina, feature: "kitchen" },
      { href: "/dashboard/app/orders", label: "Pedidos", icon: ICONS.pedidos, feature: "orders" },
    ],
  },
  {
    title: "Carta",
    items: [
      { href: "/dashboard/app/menu", label: "Menú", icon: ICONS.menu, feature: "menu" },
      // The one screen the Carta plan is named after; it was reachable only
      // from inside Menú, which hid the plan's whole point.
      { href: "/dashboard/app/menu/carta", label: "Carta pública", icon: ICONS.carta, feature: "menu" },
    ],
  },
  {
    title: "Negocio",
    items: [
      { href: "/dashboard/app/web-pedidos", label: "Web de pedidos", icon: ICONS.web, feature: "own_ordering_website" },
      { href: "/dashboard/app/customers", label: "Clientes", icon: ICONS.clientes, feature: "customers" },
      { href: "/dashboard/app/analytics", label: "Análisis", icon: ICONS.analisis, feature: "analytics" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href: "/dashboard/app/equipo", label: "Equipo", icon: ICONS.equipo, feature: "staff" },
      { href: "/dashboard/app/configuracion", label: "Configuración", icon: ICONS.config },
      { href: "/dashboard/app/configuracion/facturacion", label: "Facturación", icon: ICONS.factura, feature: "orders" },
    ],
  },
];

/**
 * Which item owns the current URL.
 *
 * Longest match wins, because the nav contains nested routes: on
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

function Glyph({ d, size = 17, strokeWidth = 1.8 }: { d: string; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FF";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
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
  const allowed = (item: NavItem) => !plan || !item.feature || PLAN_FEATURES[plan].includes(item.feature);
  const current = activeHref(sections, pathname);

  return (
    <nav className="lbd-nav" aria-label="Módulos">
      {sections.map((section) => (
        <div key={section.title ?? "inicio"} className="lbd-nav-group">
          {section.title && <span className="lbd-nav-title">{section.title}</span>}
          {section.items.map((item) => {
            const active = current === item.href;
            const locked = !allowed(item);
            return (
              // A module the plan does not include stays in its group, muted
              // and padlocked: the page it opens explains what the next plan
              // adds.
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={locked && item.feature ? `Incluido en un plan superior` : undefined}
                className={`lbd-nav-item${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
              >
                <Glyph d={item.icon} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {locked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Incluido en un plan superior">
                    <path d="M5 11h14v9.5H5zM8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                )}
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
  roleLabel,
  variant = "admin",
  badgeLabel = "Admin",
  plan,
  restaurants = [],
  activeRestaurantId,
}: {
  userEmail: string;
  /** "Dueño", "Administrador"… shown under the person's name. */
  roleLabel?: string;
  variant?: "admin" | "client";
  badgeLabel?: string;
  plan?: PlanValue;
  restaurants?: RestaurantOption[];
  activeRestaurantId?: string;
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

  const isClient = variant === "client" && activeRestaurantId;
  const sub = isClient ? (plan ? `Plan ${PLAN_LABELS[plan]}` : "") : "Administración";
  const name = isClient ? (restaurants.find((r) => r.id === activeRestaurantId)?.name ?? badgeLabel) : badgeLabel;
  const userName = userEmail.split("@")[0];

  const content = (onNavigate?: () => void) => (
    <>
      <Link href={variant === "client" ? "/dashboard/app/overview" : "/dashboard/admin/overview"} onClick={onNavigate} className="lbd-brand" aria-label="FoodFlow">
        FoodFlow<span aria-hidden />
      </Link>

      <div className="lbd-venue">
        <span className="lbd-venue-mark">{initialsOf(name)}</span>
        <div className="lbd-venue-text">
          <span className="lbd-venue-name">{name}</span>
          {sub && <span className="lbd-venue-sub">{sub}</span>}
        </div>
      </div>
      {isClient && restaurants.length > 1 && <RestaurantSwitcher restaurants={restaurants} activeRestaurantId={activeRestaurantId} />}

      <NavList pathname={pathname} sections={sections} plan={navPlan} onNavigate={onNavigate} />

      <div className="lbd-user">
        <span className="lbd-user-mark">{userEmail.slice(0, 2).toUpperCase()}</span>
        <div className="lbd-user-text">
          <span className="lbd-user-name">{userName}</span>
          {roleLabel && <span className="lbd-user-role">{roleLabel}</span>}
        </div>
        <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className="lbd-user-out">
          <Glyph d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" size={16} strokeWidth={1.9} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="lbd-side">{content()}</aside>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <m.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={closeSidebar}
              className="lbd-scrim"
              aria-hidden
            />
            <m.aside
              key="panel"
              initial={{ x: "-105%" }}
              animate={{ x: 0 }}
              exit={{ x: "-105%" }}
              transition={{ duration: 0.35, ease: EASE }}
              className="lbd-side lbd-side--drawer"
            >
              <button type="button" onClick={closeSidebar} aria-label="Cerrar menú" className="lbd-drawer-close">
                <Glyph d="M6 6l12 12M18 6L6 18" size={18} strokeWidth={2} />
              </button>
              {content(closeSidebar)}
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
