import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import LoginFlow from "@/components/dashboard/LoginFlow";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = {
  title: "Entrar",
  // The sign-in screen has nothing for a searcher and everything behind
  // it is private. robots.js blocks the crawl; this covers the case where
  // the URL is reached from a link somewhere else.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Someone who is already signed in has nothing to do here. Without this, a
  // remembered session still greets them with the form every time they press
  // "Entrar" on the landing page. `getCurrentUser` is the database check, not
  // just the cookie: a session that another login has since replaced comes
  // back null and falls through to the form, so this can never loop.
  const user = await getCurrentUser();
  if (user) {
    const { next } = await searchParams;
    const wanted = Array.isArray(next) ? next[0] : next;
    // Only a path inside the dashboard. `/dashboard` itself picks the right
    // home for the role, which is also where a bad or missing `next` lands.
    redirect(wanted && /^\/dashboard(\/|$)/.test(wanted) ? wanted : "/dashboard");
  }

  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <LoginFlow />
      </Suspense>
    </AuthPageShell>
  );
}
