"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Invisible ticker that re-runs the server component tree on an interval,
// so pages like Overview/Orders feel live without a dedicated API route.
export default function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
