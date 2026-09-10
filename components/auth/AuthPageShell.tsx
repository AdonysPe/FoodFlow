import type { ReactNode } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import { IconArrowRight } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-5 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-12rem] -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.18),transparent_62%)] blur-3xl"
        />
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-4 sm:inset-x-8 sm:top-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13.5px] font-medium text-fg/45 transition-colors hover:text-fg/80"
          >
            <IconArrowRight className="h-3.5 w-3.5 rotate-180" />
            Volver al inicio
          </Link>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </MotionProvider>
  );
}
