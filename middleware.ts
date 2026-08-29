import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Only checks the JWT's signature/claims (no DB call) so this stays
// Edge-runtime compatible. Fresh role/data is re-checked server-side.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const { pathname } = request.nextUrl;

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
  matcher: ["/dashboard/:path*"],
};
