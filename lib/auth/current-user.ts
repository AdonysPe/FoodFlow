import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Verifies the session cookie and re-reads the User row from the DB, so
// role/data are always fresh even though the JWT itself is stateless.
//
// Cached per request: a layout, a page and a server action in the same render
// all ask for the current user, and that should be one query, not three.
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.sessionVersion !== payload.sessionVersion) return null;
  return user;
});
