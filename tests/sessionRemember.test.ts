import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ------------------------------------------------------------------ mocks

const jar = vi.hoisted(() => ({
  sets: [] as Array<{ name: string; value: string; options: Record<string, unknown> }>,
  incoming: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    set: (name: string, value: string, options: Record<string, unknown>) =>
      void jar.sets.push({ name, value, options }),
    get: (name: string) => (jar.incoming.has(name) ? { value: jar.incoming.get(name) } : undefined),
    delete: vi.fn(),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ verifyCsrf: () => true }));
vi.mock("@/lib/security/clientHash", () => ({ callerIpHash: async () => "ip-hash" }));
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimit: vi.fn(async () => ({ ok: true as const, remaining: 5 })),
}));

const audit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/audit/log", () => ({ logAudit: audit }));

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  restaurant: { findFirst: vi.fn() },
  staffMembership: { findFirst: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const current = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: async () => current.user }));

import { hashPassword } from "../lib/auth/password";
import {
  REMEMBER_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "../lib/auth/session";
import { POST as login } from "../app/api/auth/login/route";
import { selectActiveRestaurant } from "../lib/actions/restaurants";

const DAY = 24 * 60 * 60;

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
  process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
  process.env.BCRYPT_SALT_ROUNDS = "10";
});

beforeEach(() => {
  jar.sets.length = 0;
  jar.incoming.clear();
  current.user = null;
  vi.clearAllMocks();
});

/** exp - iat of a token, read from its payload without trusting any claim. */
function lifetimeOf(token: string): number {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return payload.exp - payload.iat;
}

const BASE = {
  sub: "user-1",
  email: "owner@example.com",
  role: "restaurant_owner" as const,
  sessionVersion: 4,
};

// ------------------------------------------------------------ the token

describe("duracion de la sesion", () => {
  it("sin marcar dura un dia; marcada, treinta", async () => {
    const plain = await createSessionToken(BASE);
    const kept = await createSessionToken({ ...BASE, remember: true });

    expect(lifetimeOf(plain)).toBe(SESSION_TTL_SECONDS);
    expect(SESSION_TTL_SECONDS).toBe(DAY);
    expect(lifetimeOf(kept)).toBe(REMEMBER_TTL_SECONDS);
    expect(REMEMBER_TTL_SECONDS).toBe(30 * DAY);
  });

  it("el token lleva la eleccion y la devuelve al verificarse", async () => {
    const kept = await verifySessionToken(await createSessionToken({ ...BASE, remember: true }));
    const plain = await verifySessionToken(await createSessionToken(BASE));
    expect(kept?.remember).toBe(true);
    expect(plain?.remember).toBe(false);
  });

  it("un token anterior al cambio (sin el claim) se lee como sesion normal", async () => {
    // Same signature the app uses, minus the claim - what is already in browsers.
    const { SignJWT } = await import("jose");
    const legacy = await new SignJWT({ email: BASE.email, role: BASE.role, sessionVersion: 4 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(BASE.sub)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    await expect(verifySessionToken(legacy)).resolves.toMatchObject({ sub: "user-1", remember: false });
  });

  it("la cookie solo es persistente si se pidio", () => {
    const kept = sessionCookieOptions(true);
    const plain = sessionCookieOptions(false);
    expect(kept.maxAge).toBe(30 * DAY);
    // No Max-Age at all is what makes it a session cookie.
    expect("maxAge" in plain).toBe(false);
    for (const options of [kept, plain]) {
      expect(options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/" });
    }
  });
});

// ------------------------------------------------------------- login route

async function postLogin(body: Record<string, unknown>) {
  const user = {
    id: "user-1",
    email: "owner@example.com",
    role: "restaurant_owner",
    passwordHash: await hashPassword("FoodFlow9"),
    requiresPasswordSetup: false,
    loginLockedUntil: null,
    sessionVersion: 4,
  };
  db.user.findUnique.mockResolvedValue(user);
  db.user.update.mockResolvedValue({ ...user, sessionVersion: 5 });

  return login(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/auth/login", () => {
  it("con Mantener sesion iniciada deja una cookie de 30 dias", async () => {
    const response = await postLogin({ email: "owner@example.com", password: "FoodFlow9", remember: true });
    expect(response.status).toBe(200);

    expect(jar.sets).toHaveLength(1);
    const [cookie] = jar.sets;
    expect(cookie.name).toBe(SESSION_COOKIE);
    expect(cookie.options.maxAge).toBe(30 * DAY);
    expect(lifetimeOf(cookie.value)).toBe(30 * DAY);
    await expect(verifySessionToken(cookie.value)).resolves.toMatchObject({
      sessionVersion: 5,
      remember: true,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ after: { role: "restaurant_owner", remember: true } })
    );
  });

  it.each([
    ["sin marcar", { email: "owner@example.com", password: "FoodFlow9", remember: false }],
    ["sin enviar el campo", { email: "owner@example.com", password: "FoodFlow9" }],
  ])("%s deja una cookie de sesion (sin Max-Age) y un token de un dia", async (_label, body) => {
    const response = await postLogin(body);
    expect(response.status).toBe(200);

    const [cookie] = jar.sets;
    expect("maxAge" in cookie.options).toBe(false);
    expect(lifetimeOf(cookie.value)).toBe(DAY);
    await expect(verifySessionToken(cookie.value)).resolves.toMatchObject({ remember: false });
  });

  it("rechaza un valor que no sea booleano en vez de interpretarlo", async () => {
    for (const remember of ["true", 1, "yes", null]) {
      const response = await postLogin({ email: "owner@example.com", password: "FoodFlow9", remember });
      expect(response.status).toBe(401);
    }
    expect(jar.sets).toHaveLength(0);
  });

  it("una contrasena incorrecta no deja ninguna cookie, marque lo que marque", async () => {
    db.$queryRaw.mockResolvedValue([{ failedLoginAttempts: 1, loginLockedUntil: null }]);
    const response = await postLogin({ email: "owner@example.com", password: "WrongPass9", remember: true });
    expect(response.status).toBe(401);
    expect(jar.sets).toHaveLength(0);
  });
});

// ------------------------------------------------------- switching venue

describe("cambiar de restaurante", () => {
  const owner = { id: "user-1", email: "owner@example.com", role: "restaurant_owner", sessionVersion: 4 };
  const venue = "ckvenue0000000000000001a";

  async function switchWith(existing: { remember?: boolean }) {
    current.user = owner;
    db.restaurant.findFirst.mockResolvedValue({ id: venue });
    jar.incoming.set(SESSION_COOKIE, await createSessionToken({ ...BASE, ...existing }));
    return selectActiveRestaurant(venue);
  }

  it("conserva una sesion recordada: 30 dias y cookie persistente", async () => {
    await expect(switchWith({ remember: true })).resolves.toMatchObject({ ok: true });
    const [cookie] = jar.sets;
    expect(cookie.options.maxAge).toBe(30 * DAY);
    await expect(verifySessionToken(cookie.value)).resolves.toMatchObject({
      restaurantId: venue,
      remember: true,
    });
  });

  it("no convierte una sesion normal en una larga", async () => {
    await expect(switchWith({ remember: false })).resolves.toMatchObject({ ok: true });
    const [cookie] = jar.sets;
    expect("maxAge" in cookie.options).toBe(false);
    expect(lifetimeOf(cookie.value)).toBe(DAY);
  });
});
