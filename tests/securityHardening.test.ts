import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

// ------------------------------------------------------------------ mocks

const state = vi.hoisted(() => ({
  headers: new Headers(),
  afterQueue: [] as Array<() => unknown>,
  rateOk: true,
  csrf: true,
  userFound: true,
}));

vi.mock("next/headers", () => ({ headers: async () => state.headers, cookies: async () => new Map() }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void state.afterQueue.push(fn) };
});
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimit: vi.fn(async () =>
    state.rateOk ? { ok: true as const, remaining: 5 } : { ok: false as const, retryAfterMs: 5000 }
  ),
}));
vi.mock("@/lib/auth/csrf", () => ({ verifyCsrf: () => state.csrf }));

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email/mailer", () => ({ sendPasswordResetOTP: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/orderingWebsite", () => ({ readOrderingWebsite: vi.fn(async () => null) }));
vi.mock("@/lib/storage/s3", () => ({ readS3Config: () => null, checkBucket: vi.fn() }));

import { isValidRuc, foodflowRuc } from "../lib/subscriptions/ruc";
import { readCulqiKeys } from "../lib/subscriptions/config";
import { createCheckoutInputSchema } from "../lib/subscriptions/contract";
import { hasBearer, safeEqual } from "../lib/security/bearer";
import { callerIpHash } from "../lib/security/clientHash";
import { createSessionToken, sessionSecretStatus, verifySessionToken } from "../lib/auth/session";
import { GET as health } from "../app/api/health/route";
import { GET as pedido } from "../app/api/pedido/[slug]/route";
import { POST as clientError } from "../app/api/logging/client-error/route";
import { POST as forgotPassword } from "../app/api/auth/forgot-password/route";
import { sendPasswordResetOTP } from "../lib/email/mailer";
import nextConfig from "../next.config.mjs";
import { NextRequest } from "next/server";

beforeEach(() => {
  state.headers = new Headers();
  state.afterQueue.length = 0;
  state.rateOk = true;
  state.csrf = true;
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

// ------------------------------------------------------------------- RUC

describe("RUC", () => {
  it("valida el dígito verificador, no solo el largo", () => {
    expect(isValidRuc("20131312955")).toBe(true); // SUNAT
    expect(isValidRuc("20100070970")).toBe(true);
    expect(isValidRuc("20131312956")).toBe(false); // wrong check digit
    expect(isValidRuc("20123456789")).toBe(false);
    expect(isValidRuc("30131312955")).toBe(false); // unknown prefix
    expect(isValidRuc("2013131295")).toBe(false);
    expect(isValidRuc("2013131295a")).toBe(false);
    expect(isValidRuc("")).toBe(false);
  });

  it("el RUC del comprador en la factura se valida en el servidor", () => {
    const base = {
      restaurantId: "ckrestaurant000000000001",
      plan: "servicio",
      idempotencyKey: "8d0f6a52-3a3c-4e33-9d1f-6d2f4d1b0a11",
      acceptTerms: true,
      customer: { firstName: "Ana", lastName: "Quispe", phone: "987654321", address: "Av. Lima 123", city: "Lima" },
    };
    const factura = (ruc: string) =>
      createCheckoutInputSchema.safeParse({ ...base, billingDocument: { type: "factura", ruc, legalName: "Mi Local SAC" } }).success;
    expect(factura("20131312955")).toBe(true);
    expect(factura("20131312956")).toBe(false);
  });

  it("el RUC de FoodFlow sale de la variable pública y debe ser válido", () => {
    expect(foodflowRuc()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_LEGAL_TAX_ID", "20131312956");
    expect(foodflowRuc()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_LEGAL_TAX_ID", "20 131312955");
    expect(foodflowRuc()).toBe("20131312955");
  });
});

describe("candado de dinero real mientras el RUC está en trámite", () => {
  const liveEnv = () => {
    vi.stubEnv("CULQI_SECRET_KEY", "sk_live_secret");
    vi.stubEnv("CULQI_PUBLIC_KEY", "pk_live_public");
    vi.stubEnv("SUBSCRIPTIONS_ALLOW_LIVE", "true");
    vi.stubEnv("VERCEL_ENV", "production");
  };

  it("llaves reales sin el RUC de FoodFlow: no se puede cobrar", () => {
    liveEnv();
    const keys = readCulqiKeys();
    expect(keys.ok).toBe(false);
    expect(!keys.ok && keys.reason === "misconfigured" && keys.problems.join()).toContain("RUC de FoodFlow");
  });

  it("con el RUC configurado y todo lo demás en regla, sí", () => {
    liveEnv();
    vi.stubEnv("NEXT_PUBLIC_LEGAL_TAX_ID", "20131312955");
    expect(readCulqiKeys().ok).toBe(true);
  });

  it("las llaves de prueba no lo necesitan: nada se cobra", () => {
    vi.stubEnv("CULQI_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("CULQI_PUBLIC_KEY", "pk_test_public");
    expect(readCulqiKeys().ok).toBe(true);
  });

  it("el estado por defecto es apagado: sin variables no hay nada activo", () => {
    expect(readCulqiKeys()).toEqual({ ok: false, reason: "absent" });
  });
});

// ------------------------------------------------------- comparaciones

describe("comparaciones de secretos", () => {
  it("safeEqual no depende del largo y hasBearer exige el esquema", () => {
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "aa")).toBe(false);
    const req = (auth?: string) => new Request("https://x", { headers: auth ? { authorization: auth } : {} });
    expect(hasBearer(req("Bearer s3cret"), "s3cret")).toBe(true);
    expect(hasBearer(req("Bearer nope"), "s3cret")).toBe(false);
    expect(hasBearer(req("s3cret"), "s3cret")).toBe(false);
    expect(hasBearer(req(), "s3cret")).toBe(false);
    // No secret configured: nobody is authorized, not even an empty bearer.
    expect(hasBearer(req("Bearer "), "")).toBe(false);
    expect(hasBearer(req("Bearer "), undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------- sesión

describe("sesión", () => {
  const secret = "j".repeat(48);

  it("solo acepta tokens HS256: ni otro algoritmo ni 'none'", async () => {
    vi.stubEnv("JWT_SECRET", secret);
    const payload = { email: "a@b.pe", role: "restaurant_owner", sessionVersion: 1 };
    const good = await createSessionToken({ sub: "u1", email: "a@b.pe", role: "restaurant_owner", sessionVersion: 1 });
    expect(await verifySessionToken(good)).toMatchObject({ sub: "u1" });

    const hs512 = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS512" })
      .setSubject("u1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    expect(await verifySessionToken(hs512)).toBeNull();

    const none = [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({ ...payload, sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
      "",
    ].join(".");
    expect(await verifySessionToken(none)).toBeNull();
    expect(await verifySessionToken(good.slice(0, -3) + "abc")).toBeNull();
  });

  it("informa si la llave de sesión es propia, compartida, débil o falta", () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(sessionSecretStatus()).toBe("missing");
    vi.stubEnv("AUTH_SECRET", "short");
    expect(sessionSecretStatus()).toBe("weak");
    vi.stubEnv("AUTH_SECRET", "a".repeat(40));
    expect(sessionSecretStatus()).toBe("shared");
    vi.stubEnv("JWT_SECRET", "b".repeat(40));
    expect(sessionSecretStatus()).toBe("separate");
  });
});

// -------------------------------------------------- IP del que llama

describe("IP para los límites de frecuencia", () => {
  it("no se deja engañar por un X-Forwarded-For escrito por el cliente", async () => {
    state.headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "1.1.1.1" });
    const real = await callerIpHash();
    state.headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "9.9.9.9, 2.2.2.2" });
    expect(await callerIpHash()).toBe(real);
    state.headers = new Headers({ "x-real-ip": "203.0.113.7" });
    expect(await callerIpHash()).toBe(real);
    state.headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.8" });
    expect(await callerIpHash()).not.toBe(real);
  });
});

// ------------------------------------------------------------- /api/health

describe("/api/health", () => {
  it("el público solo ve el estado; el detalle exige el secreto del operador", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-for-tests");
    db.$queryRaw.mockRejectedValue(new Error("db down"));

    const anonymous = await health(new Request("https://foodflow.site/api/health"));
    expect(anonymous.status).toBe(503);
    expect(await anonymous.json()).toEqual({ status: "error" });

    const wrong = await health(new Request("https://foodflow.site/api/health", { headers: { authorization: "Bearer nope" } }));
    expect(await wrong.json()).toEqual({ status: "error" });

    const operator = await health(
      new Request("https://foodflow.site/api/health", { headers: { authorization: "Bearer cron-secret-for-tests" } })
    );
    const body = await operator.json();
    expect(body.checks).toBeDefined();
    expect(body.status).toBe("error");
  });
});

// ------------------------------------------------------ rutas públicas

describe("rutas públicas", () => {
  const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

  it("/api/pedido/[slug] tiene tope de frecuencia y rechaza slugs que no son válidos", async () => {
    expect((await pedido(new Request("https://x/api/pedido/mi-local"), params("mi-local"))).status).toBe(404);
    expect((await pedido(new Request("https://x/api/pedido/../x"), params("../x"))).status).toBe(404);
    expect((await pedido(new Request("https://x"), params("A".repeat(60)))).status).toBe(404);

    state.rateOk = false;
    const limited = await pedido(new Request("https://x/api/pedido/mi-local"), params("mi-local"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("5");
  });

  it("el reporte de errores del navegador también tiene tope", async () => {
    const request = () =>
      new Request("https://foodflow.site/api/logging/client-error", {
        method: "POST",
        headers: { origin: "https://foodflow.site", host: "foodflow.site", "content-type": "application/json" },
        body: JSON.stringify({ name: "Error", message: "boom" }),
      });
    state.rateOk = false;
    expect((await clientError(request())).status).toBe(429);
  });
});

// ----------------------------------------------------- recuperar contraseña

describe("recuperar contraseña", () => {
  beforeEach(() => vi.stubEnv("AUTH_SECRET", "a".repeat(40)));
  const request = (email: string) =>
    new NextRequest("https://foodflow.site/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

  it("el correo sale DESPUÉS de responder, así existir o no la cuenta no cambia el tiempo", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "dueno@local.pe" });
    db.user.update.mockResolvedValue({});
    const response = await forgotPassword(request("dueno@local.pe"));
    expect(response.status).toBe(200);
    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
    expect(state.afterQueue).toHaveLength(1);
    await state.afterQueue[0]();
    expect(sendPasswordResetOTP).toHaveBeenCalledTimes(1);
  });

  it("una cuenta que no existe recibe la misma respuesta y no envía nada", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const known = await (await forgotPassword(request("nadie@local.pe"))).json();
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "dueno@local.pe" });
    const unknown = await (await forgotPassword(request("dueno@local.pe"))).json();
    expect(known).toEqual(unknown);
    expect(state.afterQueue).toHaveLength(1);
  });

  it("si el envío falla, el código guardado se invalida sin romper nada", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "dueno@local.pe" });
    db.user.update.mockResolvedValue({});
    db.user.updateMany.mockResolvedValue({ count: 1 });
    vi.mocked(sendPasswordResetOTP).mockRejectedValueOnce(new Error("smtp down"));
    await forgotPassword(request("dueno@local.pe"));
    await expect(state.afterQueue[0]()).resolves.toBeUndefined();
    expect(db.user.updateMany).toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------- CSP

describe("CSP", () => {
  it("Culqi solo se permite en la página del checkout, y las demás siguen estrictas", async () => {
    const rules = await nextConfig.headers!();
    const cspOf = (source: string) =>
      rules.find((r) => r.source === source)!.headers.find((h) => h.key === "Content-Security-Policy")!.value;

    const general = cspOf("/:path*");
    expect(general).not.toContain("culqi");
    expect(general).toContain("frame-src 'none'");
    expect(general).toContain("frame-ancestors 'none'");

    const settings = cspOf("/dashboard/app/configuracion");
    expect(settings).toMatch(/script-src[^;]*https:\/\/checkout\.culqi\.com/);
    expect(settings).toMatch(/script-src[^;]*https:\/\/3ds\.culqi\.com/);
    expect(settings).toMatch(/connect-src[^;]*https:\/\/api\.culqi\.com/);
    // Never framable by anyone else, wherever it is.
    expect(settings).toContain("frame-ancestors 'none'");
    expect(settings).toContain("object-src 'none'");
    expect(settings).toContain("base-uri 'self'");

    // Exactly one page is widened. The certificates page is not.
    expect(rules.filter((r) => r.headers.some((h) => /culqi/.test(h.value)))).toHaveLength(1);
    expect(rules.some((r) => r.source.includes("facturacion"))).toBe(false);
  });
});
