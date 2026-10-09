import type { ReactNode } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import Toast from "@/components/dashboard/Toast";
import { panelFontClasses } from "@/components/dashboard/fonts";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import { logout } from "@/lib/actions/auth";

/**
 * The waiter's frame, design B ("Noche"): a slim header with the venue and the
 * way out, and a single column below. Same night ground and type as the panel,
 * but no sidebar: it is the screen a phone holds during service.
 */
export default async function ComandaLayout({ children }: { children: ReactNode }) {
  const { user, restaurant, isOwner } = await requireComandaRestaurant();

  return (
    <MotionProvider>
      <div data-theme="dark" className={`${panelFontClasses} lbd lbd-cm`}>
        <div className="lbd-glow" aria-hidden />
        <header className="lbd-cm-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Link href={isOwner ? "/dashboard/app/overview" : "/dashboard/comanda"} className="lbd-cm-brand" aria-label="FoodFlow">
              FoodFlow<span aria-hidden />
            </Link>
            <span className="lbd-cm-venue lbd-trunc">{restaurant?.name ?? "Comanda"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {isOwner && (
              <Link href="/dashboard/app/overview" className="lbd-cm-link">
                Panel
              </Link>
            )}
            <span className="lbd-cm-email">{user.email}</span>
            <form action={logout}>
              <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="lbd-user-out">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
                </svg>
              </button>
            </form>
          </div>
        </header>
        <main className="lbd-cm-main">{children}</main>
        <Toast />
      </div>
    </MotionProvider>
  );
}
