import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "foodflow_session";
// 7 days. The session JWT carries the role claim, and middleware trusts it for
// routing without a DB read (it can't — Edge runtime). A shorter window bounds
// how long a stale role (e.g. an owner demoted, a mozo removed) keeps its old
// routing before the next login re-mints the token. Data access is always
// re-checked against the DB in layouts/actions via getCurrentUser().
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  restaurantId?: string;
};

/**
 * Role labels minted before the enum was renamed (admin/client/mozo), mapped
 * to what they are called now.
 *
 * Tokens issued before that deploy are still valid for up to seven days, and
 * signing everyone out to rename a label would be a worse trade than reading
 * the old name. Only the ROUTING in middleware depends on this claim; every
 * data access re-reads `User.role` from the database, which already holds the
 * new value. Delete this once the last legacy token has expired.
 */
const LEGACY_ROLES: Record<string, UserRole> = {
  admin: "platform_admin",
  client: "restaurant_owner",
  mozo: "restaurant_staff",
};

const CURRENT_ROLES = new Set<string>([
  "platform_admin",
  "restaurant_owner",
  "restaurant_admin",
  "restaurant_staff",
]);

/** Whatever the token says, normalized — or null if it is not a role at all. */
function normalizeRole(claim: unknown): UserRole | null {
  if (typeof claim !== "string") return null;
  if (CURRENT_ROLES.has(claim)) return claim as UserRole;
  return LEGACY_ROLES[claim] ?? null;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

/**
 * How the session-signing key is set up, for the health check. It never
 * returns the key or any part of it.
 *  - `separate`: JWT_SECRET, its own value (what SEGURIDAD.md asks for).
 *  - `shared`:   falls back to AUTH_SECRET, which also peppers OTP and IP
 *                hashes. Works, but one leaked value then breaks both.
 *  - `weak`:     shorter than 32 characters.
 *  - `missing`:  nothing set; sessions cannot be signed.
 */
export function sessionSecretStatus(): "separate" | "shared" | "weak" | "missing" {
  const jwt = process.env.JWT_SECRET?.trim();
  const auth = process.env.AUTH_SECRET?.trim();
  const active = jwt || auth;
  if (!active) return "missing";
  if (active.length < 32) return "weak";
  return jwt ? "separate" : "shared";
}

// Uses jose (WebCrypto-based) so this also works unmodified inside
// middleware, which runs on the Edge runtime.
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
    ...(payload.restaurantId ? { restaurantId: payload.restaurantId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    // The algorithm is pinned: a token that names any other one (or "none")
    // is refused instead of being verified however its header asks.
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const role = normalizeRole(payload.role);
    if (
      !payload.sub ||
      !payload.email ||
      !role ||
      typeof payload.sessionVersion !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role,
      sessionVersion: payload.sessionVersion,
      ...(typeof payload.restaurantId === "string"
        ? { restaurantId: payload.restaurantId }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
