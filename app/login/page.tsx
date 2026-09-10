import { Suspense } from "react";
import AuthPageShell from "@/components/auth/AuthPageShell";
import LoginFlow from "@/components/dashboard/LoginFlow";

export const metadata = {
  title: "Entrar",
  // The sign-in screen has nothing for a searcher and everything behind
  // it is private. robots.js blocks the crawl; this covers the case where
  // the URL is reached from a link somewhere else.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <LoginFlow />
      </Suspense>
    </AuthPageShell>
  );
}
