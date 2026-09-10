/**
 * Everything public is crawlable; the app itself is not. /dashboard and
 * /login sit behind the session cookie, so a crawler there only ever sees a
 * redirect to the login screen — noise in the index and wasted crawl budget.
 */
import { SITE_URL as BASE } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
