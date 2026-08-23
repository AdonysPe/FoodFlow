import { Suspense } from "react";
import MotionProvider from "@/components/MotionProvider";
import LoginFlow from "@/components/dashboard/LoginFlow";

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
        <Suspense fallback={null}>
          <LoginFlow />
        </Suspense>
      </main>
    </MotionProvider>
  );
}
