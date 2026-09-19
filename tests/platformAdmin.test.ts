import { beforeAll, describe, expect, test } from "vitest";
import type { UserRole } from "@prisma/client";
import {
  PERMISSIONS,
  TENANT_ROLES,
  VENUE_MANAGER_ROLES,
  can,
  isPlatformAdmin,
  isVenueManager,
} from "../lib/auth/permissions";
import {
  PROTECTED_RESTAURANT_FIELDS,
  stripProtectedFields,
} from "../lib/auth/restaurantFields";
import { createSessionToken, verifySessionToken } from "../lib/auth/session";
import { resolveMenuTemplate } from "../lib/menuTemplates";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
  process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
});

const ALL_ROLES: UserRole[] = [
  "platform_admin",
  "restaurant_owner",
  "restaurant_admin",
  "restaurant_staff",
];

describe("permisos de plataforma", () => {
  test("solo platform_admin puede gestionar categoría y plantilla", () => {
    expect(can("platform_admin", PERMISSIONS.MANAGE_CATEGORY_TEMPLATE)).toBe(true);
    expect(can("restaurant_owner", PERMISSIONS.MANAGE_CATEGORY_TEMPLATE)).toBe(false);
    expect(can("restaurant_admin", PERMISSIONS.MANAGE_CATEGORY_TEMPLATE)).toBe(false);
    expect(can("restaurant_staff", PERMISSIONS.MANAGE_CATEGORY_TEMPLATE)).toBe(false);
  });

  test("ningún rol de restaurante tiene permisos de plataforma", () => {
    for (const role of TENANT_ROLES) {
      for (const permission of Object.values(PERMISSIONS)) {
        expect(can(role, permission)).toBe(false);
      }
    }
  });

  // The trap this whole change exists to avoid: a role whose NAME contains
  // "admin" but which belongs to a restaurant, not to FoodFlow.
  test("restaurant_admin no es administrador de plataforma", () => {
    expect(isPlatformAdmin("restaurant_admin")).toBe(false);
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    expect((TENANT_ROLES as readonly string[]).includes("restaurant_admin")).toBe(true);
    expect((TENANT_ROLES as readonly string[]).includes("platform_admin")).toBe(false);
  });

  test("el panel del local lo abren dueño y encargado, no el mozo ni la plataforma", () => {
    expect(isVenueManager("restaurant_owner")).toBe(true);
    expect(isVenueManager("restaurant_admin")).toBe(true);
    expect(isVenueManager("restaurant_staff")).toBe(false);
    expect(isVenueManager("platform_admin")).toBe(false);
    expect(VENUE_MANAGER_ROLES.every((role) => can(role, PERMISSIONS.VIEW_ALL_RESTAURANTS))).toBe(
      false
    );
  });

  // If someone adds a role to the enum and forgets the permission map, `can()`
  // would throw on an undefined entry at runtime instead of denying. This is
  // the runtime half of the `Record<UserRole, …>` the map is typed with.
  test("todos los roles están declarados en el mapa de permisos", () => {
    for (const role of ALL_ROLES) {
      expect(() => can(role, PERMISSIONS.VIEW_ALL_RESTAURANTS)).not.toThrow();
    }
    expect(new Set([...TENANT_ROLES, "platform_admin"])).toEqual(new Set(ALL_ROLES));
  });
});

describe("sesiones durante el cambio de nombre de los roles", () => {
  test("un token nuevo conserva el rol tal cual", async () => {
    const token = await createSessionToken({
      sub: "user-1",
      email: "operador@foodflow.site",
      role: "platform_admin",
      sessionVersion: 3,
    });
    await expect(verifySessionToken(token)).resolves.toMatchObject({
      role: "platform_admin",
      sessionVersion: 3,
    });
  });

  // Tokens minted before the rename are still valid for up to seven days. They
  // must keep routing correctly — and, above all, an old "client" token must
  // NOT be read as any kind of admin.
  test("un token antiguo se traduce al nombre nuevo", async () => {
    const legacy = await new (await import("jose")).SignJWT({
      email: "dueno@ejemplo.com",
      role: "client",
      sessionVersion: 1,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-2")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET as string));

    const payload = await verifySessionToken(legacy);
    expect(payload?.role).toBe("restaurant_owner");
    expect(isPlatformAdmin(payload!.role)).toBe(false);
  });

  test("un rol desconocido invalida el token en vez de pasar", async () => {
    const forged = await new (await import("jose")).SignJWT({
      email: "atacante@ejemplo.com",
      role: "superadmin",
      sessionVersion: 1,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-3")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET as string));

    await expect(verifySessionToken(forged)).resolves.toBeNull();
  });
});

describe("campos de Restaurant reservados a la plataforma", () => {
  test("categoría y plantilla están en la lista protegida", () => {
    expect(PROTECTED_RESTAURANT_FIELDS).toContain("categoryId");
    expect(PROTECTED_RESTAURANT_FIELDS).toContain("menuTemplateOverride");
    expect(PROTECTED_RESTAURANT_FIELDS).toContain("plan");
  });

  test("se descartan aunque lleguen en el cuerpo de la petición", () => {
    const clean = stripProtectedFields({
      slug: "mi-local",
      categoryId: "pizzeria",
      menuTemplateOverride: "chifa",
      plan: "negocio",
      billingStatus: "active",
      ownerId: "otro-usuario",
    });

    expect(clean).toEqual({ slug: "mi-local" });
    expect("categoryId" in clean).toBe(false);
    expect("menuTemplateOverride" in clean).toBe(false);
  });
});

describe("plantilla efectiva de la carta", () => {
  test("la plantilla propia gana, y sin ella manda la categoría", () => {
    expect(resolveMenuTemplate("chifa", "pizzeria")).toBe("chifa");
    expect(resolveMenuTemplate(null, "pizzeria")).toBe("pizzeria");
  });

  test("guardar null devuelve el local a la plantilla de su categoría", () => {
    // What "Usar la plantilla predeterminada de la categoría" saves.
    expect(resolveMenuTemplate(null, "cevicheria")).toBe("cevicheria");
  });

  test("una plantilla no registrada no se aplica nunca", () => {
    expect(resolveMenuTemplate("no-existe", "chifa")).toBe("criolla");
    expect(resolveMenuTemplate(null, null)).toBe("criolla");
  });
});
