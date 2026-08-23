"use client";

import { usePathname } from "next/navigation";
import { IconMenu } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";

const TITLES: Record<string, string> = {
  overview: "Overview",
  leads: "Leads",
  restaurants: "Restaurants",
  analytics: "Analytics",
};

export default function Topbar() {
  const pathname = usePathname();
  const openSidebar = useDashboardStore((s) => s.openSidebar);
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  const title = TITLES[segment] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.07] bg-ink-950/70 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Open menu"
        className="rounded-lg p-2 text-white/60 hover:bg-white/[0.06] hover:text-white lg:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>
      <h1 className="font-display text-[17px] font-bold tracking-[-0.01em] text-white">{title}</h1>
    </header>
  );
}
