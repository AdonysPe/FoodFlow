import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/carta";

// Hosts we own. A subdomain of one of these can name a venue; anything else
// (a Vercel preview URL, a custom domain someone points at us) is served as-is.
const ROOT_HOSTS = ["foodflow.site", "localhost"];

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
      return NextResponse.rewrite(url);
    }
    // A venue host is for one page. Anything else belongs to the product, and
    // answering it here too would publish every marketing page at every
    // venue's address.
    const apex = new URL(request.url);
    apex.host = ROOT_HOSTS[0];
    apex.port = "";
    apex.protocol = "https:";
    return NextResponse.redirect(apex, 308);
  }

  // ------------------------------------------------------------ the dashboard
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // The comanda is the one shared screen: owners and their waiters both use it.
  if (
    pathname.startsWith("/dashboard/comanda") &&
    session.role !== "client" &&
    session.role !== "mozo"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard/app") && session.role !== "client") {
    return NextResponse.redirect(
      new URL(session.role === "mozo" ? "/dashboard/comanda" : "/dashboard/admin/overview", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own assets and the API. The API is excluded so a
  // carta's live-update stream still answers on the venue subdomain instead of
  // being redirected to the apex mid-connection.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
