import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import LoginFlow from "@/components/dashboard/LoginFlow";
import { getCurrentUser } from "@/lib/auth/current-user";

// The B design's type pair, as on the home page: loaded for this route only,
// and re-pointed to the theme's font roles by the `.lb` block at the end of
// globals.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

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

  // Design B ("Noche"): the screen is pinned to the night theme and draws its
  // own header, so it does not use `AuthPageShell` (register, forgot and reset
  // still do).
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb lb-lg-page`}>
      <MotionProvider>
        <Suspense fallback={null}>
          <LoginFlow />
        </Suspense>
      </MotionProvider>
    </div>
  );
}
