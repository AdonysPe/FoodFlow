import type { ReactNode } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import Toast from "@/components/dashboard/Toast";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import { logout } from "@/lib/actions/auth";
import { IconLogout } from "@/components/ui/Icons";

export default async function ComandaLayout({ children }: { children: ReactNode }) {
  const { user, restaurant, isOwner } = await requireComandaRestaurant();

  return (
    <MotionProvider>
      <div className="min-h-screen bg-ink-950">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-gradient-accent">
              FoodFlow
            </span>
            <span className="truncate rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
              {restaurant?.name ?? "Comanda"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwner && (
              <Link
                href="/dashboard/app/overview"
                className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-white/45 hover:bg-white/[0.06] hover:text-white/80"
              >
                Panel
              </Link>
            )}
            <span className="hidden text-[12px] text-white/35 sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
              >
                <IconLogout className="h-[17px] w-[17px]" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-2xl">{children}</main>
        <Toast />
      </div>
    </MotionProvider>
  );
}
