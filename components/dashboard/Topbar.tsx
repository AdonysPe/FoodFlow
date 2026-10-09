"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store/dashboardStore";

const DEFAULT_TITLES: Record<string, string> = {
  overview: "Overview",
  leads: "Leads",
  contactos: "Contactos",
  restaurants: "Restaurants",
  analytics: "Analytics",
  audit: "Audit log",
};

/**
 * The strip above every panel screen, design B. On a phone it carries the
 * menu button and the brand; on a desktop it is just the screen's title.
 * A screen that draws its own heading (the Resumen greets the owner) maps its
 * title to "" and the strip disappears on desktop instead of repeating it.
 */
export default function Topbar({ titles = DEFAULT_TITLES, home = "/dashboard" }: { titles?: Record<string, string>; home?: string }) {
  const pathname = usePathname();
  const openSidebar = useDashboardStore((s) => s.openSidebar);
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  const title = titles[segment] ?? "Dashboard";

  return (
    <header className={`lbd-top${title ? "" : " lbd-top--bare"}`}>
      <button type="button" onClick={openSidebar} aria-label="Abrir menú" className="lbd-top-menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <Link href={home} className="lbd-top-brand" aria-label="FoodFlow">
        FoodFlow<span aria-hidden />
      </Link>
      {title ? <h1 className="lbd-top-title">{title}</h1> : null}
    </header>
  );
}
