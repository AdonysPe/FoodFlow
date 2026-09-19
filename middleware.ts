import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
// Type-only Prisma import inside, so this stays Edge-safe.
import { isVenueManager, TENANT_ROLES } from "@/lib/auth/permissions";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/carta";

// Hosts we own. A subdomain of one of these can name a venue; anything else
// (a Vercel preview URL, a custom domain someone points at us) is served as-is.
const ROOT_HOSTS = ["foodflow.site", "localhost"];
const UTM_COOKIE = "foodflow_utm";
const UTM_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function utmCookieValue(request: NextRequest): string | null {
  const params = request.nextUrl.searchParams;
  const value = {
    source: params.get("utm_source")?.slice(0, 200) ?? null,
    medium: params.get("utm_medium")?.slice(0, 200) ?? null,
    campaign: params.get("utm_campaign")?.slice(0, 200) ?? null,
  };
  return value.source || value.medium || value.campaign ? JSON.stringify(value) : null;
}

function withUtmCookie(
  request: NextRequest,
  response: NextResponse,
  value: string | null
): NextResponse {
  if (value) {
    response.cookies.set(UTM_COOKIE, value, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: UTM_MAX_AGE_SECONDS,
    });
  }
  return response;
}

/**
 * `tanta.foodflow.site` → `"tanta"`, everything else → null.
 *
 * Deep subdomains are refused rather than flattened: `a.b.foodflow.site` is
 * not a venue, and treating it as one would let a wildcard certificate holder
 * invent addresses.
 */
function venueSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const name = host.split(":")[0].toLowerCase();

  for (const root of ROOT_HOSTS) {
    if (name === root || name === `www.${root}`) return null;
    if (!name.endsWith(`.${root}`)) continue;

    const sub = name.slice(0, -(root.length + 1));
    if (!sub || sub.includes(".")) return null;
    if (RESERVED_SLUGS.has(sub)) return null;
    return SLUG_PATTERN.test(sub) ? sub : null;
  }
  return null;
}

/**
 * Only checks the JWT's signature/claims (no DB call) so this stays
 * Edge-runtime compatible. Fresh role/data is re-checked server-side.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const utm = utmCookieValue(request);

  // ------------------------------------------------- the venue's own address
  //
  // Serving the carta from a subdomain costs one rewrite here. It stays dark
  // until a wildcard record exists (`*.foodflow.site` at the registrar, plus
  // the wildcard domain on Vercel); /carta/<slug> works either way, which is
  // why that path — not this one — is what the dashboard hands out.
  const venue = venueSlugFromHost(request.headers.get("host"));
  if (venue) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/carta/${venue}`;
      return withUtmCookie(request, NextResponse.rewrite(url), utm);
    }
    // A venue host is for one page. Anything else belongs to the product, and
    // answering it here too would publish every marketing page at every
    // venue's address.
    const apex = new URL(request.url);
    apex.host = ROOT_HOSTS[0];
    apex.port = "";
    apex.protocol = "https:";
    return withUtmCookie(request, NextResponse.redirect(apex, 308), utm);
  }

  // ------------------------------------------------------------ the dashboard
  if (!pathname.startsWith("/dashboard")) {
    return withUtmCookie(request, NextResponse.next(), utm);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withUtmCookie(request, NextResponse.redirect(loginUrl), utm);
  }

  if (pathname.startsWith("/dashboard/admin") && session.role !== "platform_admin") {
    return withUtmCookie(
      request,
      NextResponse.redirect(new URL("/dashboard", request.url)),
      utm
    );
  }

  // The comanda is the one shared screen: everyone who works in the venue uses
  // it. Only the platform admin, who belongs to no venue, is kept out.
  if (
    pathname.startsWith("/dashboard/comanda") &&
    !(TENANT_ROLES as readonly string[]).includes(session.role)
  ) {
    return withUtmCookie(
      request,
      NextResponse.redirect(new URL("/dashboard", request.url)),
      utm
    );
  }

  // The venue dashboard: the owner and a manager they promoted. A waiter is
  // sent to the comanda, the platform admin to its own panel.
  if (pathname.startsWith("/dashboard/app") && !isVenueManager(session.role)) {
    return withUtmCookie(
      request,
      NextResponse.redirect(
        new URL(
          session.role === "restaurant_staff"
            ? "/dashboard/comanda"
            : "/dashboard/admin/overview",
          request.url
        )
      ),
      utm
    );
  }

  return withUtmCookie(request, NextResponse.next(), utm);
}

export const config = {
  // Everything except Next's own assets and the API. The API is excluded so a
  // carta's live-update stream still answers on the venue subdomain instead of
  // being redirected to the apex mid-connection.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
