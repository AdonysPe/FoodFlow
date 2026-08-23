import { Suspense } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import LoginFlow from "@/components/dashboard/LoginFlow";
import { IconArrowRight } from "@/components/ui/Icons";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <MotionProvider>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-5 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-12rem] -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,47,0.22),transparent_62%)] blur-3xl"
        />
        <Link
          href="/"
          className="absolute left-5 top-6 inline-flex items-center gap-2 text-[13.5px] font-medium text-white/45 transition-colors hover:text-white/80 sm:left-8 sm:top-8"
        >
          <IconArrowRight className="h-3.5 w-3.5 rotate-180" />
          Back to home
        </Link>
        <Suspense fallback={null}>
          <LoginFlow />
        </Suspense>
      </main>
    </MotionProvider>
  );
}
