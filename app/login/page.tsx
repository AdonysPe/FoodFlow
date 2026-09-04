import { Suspense } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import LoginFlow from "@/components/dashboard/LoginFlow";
import { IconArrowRight } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const metadata = {
  title: "Entrar",
  // The sign-in screen has nothing for a searcher and everything behind
  // it is private. robots.js blocks the crawl; this covers the case where
  // the URL is reached from a link somewhere else.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <MotionProvider>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-5 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-12rem] -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.18),transparent_62%)] blur-3xl"
        />
        <Link
          href="/"
          className="absolute left-5 top-6 inline-flex items-center gap-2 text-[13.5px] font-medium text-fg/45 transition-colors hover:text-fg/80 sm:left-8 sm:top-8"
        >
          <IconArrowRight className="h-3.5 w-3.5 rotate-180" />
          Volver al inicio
        </Link>
        <ThemeToggle className="absolute right-5 top-6 sm:right-8 sm:top-8" />
        <Suspense fallback={null}>
          <LoginFlow />
        </Suspense>
      </main>
    </MotionProvider>
  );
}
