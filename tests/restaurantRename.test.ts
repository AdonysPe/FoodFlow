import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRestaurantName, restaurantNameSchema } from "../lib/restaurantName";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  auth: vi.fn(),
  rateLimit: vi.fn(),
  audit: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { restaurant: { update: mocks.update } } }));
vi.mock("@/lib/auth/restaurant", () => ({ requireClientRestaurant: mocks.auth }));
vi.mock("@/lib/security/rateLimit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/audit/log", () => ({ logAudit: mocks.audit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { renameRestaurant } from "../lib/actions/restaurantProfile";

const owner = { id: "owner-1", email: "dueno@tanta.pe" };
const venue = { id: "venue-1", name: "Tanta", slug: "tanta", ownerId: "owner-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: owner, restaurant: venue, isOwner: true });
  mocks.rateLimit.mockResolvedValue({ ok: true, remaining: 4 });
  mocks.update.mockResolvedValue({});
});

describe("nombre del restaurante: normalización", () => {
  it("recorta, colapsa espacios y quita saltos de línea", () => {
    expect(normalizeRestaurantName("  Tanta \n  San   Isidro  ")).toBe("Tanta San Isidro");
  });
  it("elimina caracteres invisibles que harían iguales dos nombres distintos", () => {
    const zeroWidth = String.fromCharCode(0x200b);
    expect(normalizeRestaurantName(`Tan${zeroWidth}ta`)).toBe("Tanta");
  });
  it("conserva tildes, eñes, símbolos y números", () => {
    expect(normalizeRestaurantName("Café & Ñam 22")).toBe("Café & Ñam 22");
  });
  it("exige entre 2 y 80 caracteres ya normalizados", () => {
    expect(restaurantNameSchema.safeParse(" a ").success).toBe(false);
    expect(restaurantNameSchema.safeParse("   ").success).toBe(false);
    expect(restaurantNameSchema.safeParse("x".repeat(80)).success).toBe(true);
    expect(restaurantNameSchema.safeParse("x".repeat(81)).success).toBe(false);
    expect(restaurantNameSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("renameRestaurant", () => {
  it("cambia solo el nombre, avisa a las cartas abiertas y deja rastro", async () => {
    const result = await renameRestaurant({ name: "  Tanta   Cebichería " });

    expect(result).toEqual({ ok: true, data: { name: "Tanta Cebichería" } });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const call = mocks.update.mock.calls[0][0];
    // Refuses to land on a venue the signed-in user does not own.
    expect(call.where).toEqual({ id: "venue-1", ownerId: "owner-1" });
    // Nothing but the name and the carta's live-update counter: never the slug
    // (QR codes), the plan, the billing state or the owner.
    expect(Object.keys(call.data).sort()).toEqual(["cartaVersion", "name"]);
    expect(call.data.name).toBe("Tanta Cebichería");
    expect(call.data.cartaVersion).toEqual({ increment: 1 });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "restaurant.rename",
        restaurantId: "venue-1",
        before: { name: "Tanta" },
        after: { name: "Tanta Cebichería" },
      })
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
    expect(mocks.revalidate).toHaveBeenCalledWith("/carta/tanta");
  });

  it("no deja cambiarlo a quien no es el dueño", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "mgr", email: "m@tanta.pe" }, restaurant: venue, isOwner: false });
    const result = await renameRestaurant({ name: "Otro nombre" });
    expect(result.ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it("falla con claridad si la cuenta no tiene restaurante", async () => {
    mocks.auth.mockResolvedValue({ user: owner, restaurant: null, isOwner: true });
    expect((await renameRestaurant({ name: "Nuevo" })).ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([["", "al menos"], ["a", "al menos"], ["x".repeat(81), "hasta"]])("rechaza el nombre %j", async (name, fragment) => {
    const result = await renameRestaurant({ name });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(fragment);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rechaza un nombre que no cambia, aunque difiera en espacios", async () => {
    const result = await renameRestaurant({ name: "  Tanta  " });
    expect(result).toEqual({ ok: false, error: "Ese ya es el nombre de tu restaurante." });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("limita los cambios seguidos", async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false, retryAfterMs: 1000 });
    const result = await renameRestaurant({ name: "Nuevo nombre" });
    expect(result.ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rateLimit).toHaveBeenCalledWith("restaurant-rename", "venue-1", expect.any(Object));
  });

  it("no revienta ni audita si la fila ya no es del usuario", async () => {
    mocks.update.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    const result = await renameRestaurant({ name: "Nuevo nombre" });
    expect(result.ok).toBe(false);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("no toca la dirección pública aunque llegue en la entrada", async () => {
    await renameRestaurant({ name: "Nuevo nombre", slug: "hackeado", plan: "negocio" } as never);
    const call = mocks.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("slug");
    expect(call.data).not.toHaveProperty("plan");
  });
});
