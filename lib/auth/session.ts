import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

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
  role: "admin" | "client" | "mozo";
  sessionVersion: number;
  restaurantId?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
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
    const { payload } = await jwtVerify(token, secretKey());
    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      typeof payload.sessionVersion !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as SessionPayload["role"],
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
