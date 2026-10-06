import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "foodflow_session";
// How long a session lasts depends on whether the person ticked "Mantener
// sesión iniciada en este dispositivo" at login.
//
// Not ticked: a browser-session cookie (gone when the browser closes) and a
// one-day ceiling on the token itself, for browsers that restore session
// cookies after a restart and for a tablet that never closes. A day covers a
// full service, so a waiter is never signed out mid-shift.
//
// Ticked: a persistent cookie for 30 days. That is opt-in and per device, so
// the 7-day cut SEGURIDAD.md made for the default still stands for everyone
// who did not ask for more. The cost is the one that document already
// accepts: the role in the JWT, which only middleware uses for routing, can be
// stale for the length of the session. Data access never trusts that claim —
// layouts and actions re-read the user from the database — and a changed
// password or a newer login bumps `sessionVersion`, which ends the session.
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
export const REMEMBER_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  restaurantId?: string;
  /** Signed in with "Mantener sesión iniciada" — the 30-day, persistent kind. */
  remember?: boolean;
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
  const remember = payload.remember === true;
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
    ...(payload.restaurantId ? { restaurantId: payload.restaurantId } : {}),
    // Only written when true, so an ordinary token stays as small as before.
    ...(remember ? { remember: true } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS}s`)
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
      // A token minted before this claim existed reads as not remembered.
      remember: payload.remember === true,
    };
  } catch {
    return null;
  }
}

/**
 * The cookie's attributes. `maxAge` is left out unless the person asked to be
 * remembered: no `Max-Age`/`Expires` is what makes it a session cookie.
 */
export function sessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    ...(remember ? { maxAge: REMEMBER_TTL_SECONDS } : {}),
  };
}

export async function setSessionCookie(token: string, remember = false): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
}

/** The verified payload of the cookie on this request, or null. */
export async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
