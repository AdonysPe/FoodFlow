import { beforeEach, describe, expect, it, vi } from "vitest";

// What a page does on its own is not a control: a Server Action is a POST
// endpoint and a billing route is a fetch. These tests call them directly, the
// way a Carta-plan or lapsed venue would, and expect the same refusal the page
// would have shown.

const mocks = vi.hoisted(() => ({
  prisma: {
    restaurantTable: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    order: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    menuItem: { findMany: vi.fn() },
    receiptSettings: { findUnique: vi.fn() },
    staffMembership: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    subscription: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    restaurant: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  client: vi.fn(),
  comanda: vi.fn(),
  cookieToken: { value: "token" } as { value: string } | undefined,
  verify: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/restaurant", () => ({
  requireClientRestaurant: mocks.client,
  requireComandaRestaurant: mocks.comanda,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.cookieToken }) }));
vi.mock("@/lib/auth/session", () => ({ SESSION_COOKIE: "session", verifySessionToken: mocks.verify }));
vi.mock("@/lib/security/rateLimit", () => ({ rateLimit: async () => ({ ok: true, remaining: 1 }) }));
vi.mock("@/lib/billing/config-service", () => ({ checkEmissionReadiness: async () => ({ ready: true }) }));
vi.mock("@/lib/audit/log", () => ({ logAudit: vi.fn() }));

import { featureRefusal } from "../lib/auth/plan";
import { withApi } from "../lib/api/guard";
import { createTable, deleteTable } from "../lib/actions/tables";
import { createReservation } from "../lib/actions/reservations";
import { createOrder, getKitchenOrders, updateOrderStatus } from "../lib/actions/orders";
import { payOrder, retryEmission, sendComanda, voidOrder } from "../lib/actions/comanda";
import { saveBillingSettings, testOseConnection, uploadCertificate } from "../lib/actions/billing";
import { addStaffMember } from "../lib/actions/staff";

const base = { id: "venue", name: "Mi local", billingSource: "manual", accessUntil: null };
const carta = { ...base, plan: "carta", billingStatus: "active" };
const servicio = { ...base, plan: "servicio", billingStatus: "active" };
// A card subscription whose payment never arrived: the plan says servicio, the
// billing state says locked.
const lapsed = { ...base, plan: "servicio", billingSource: "provider", billingStatus: "suspended" };

const owner = { id: "owner", email: "owner@example.test" };
const session = (restaurant: object) => {
  mocks.client.mockResolvedValue({ user: owner, restaurant, restaurants: [restaurant], isOwner: true });
  mocks.comanda.mockResolvedValue({ user: owner, restaurant, restaurants: [restaurant], isOwner: true });
};

beforeEach(() => {
  vi.clearAllMocks();
  session(servicio);
});

describe("featureRefusal", () => {
  it("lets a venue use what its plan includes", () => {
    expect(featureRefusal(servicio, "tables")).toBeNull();
    expect(featureRefusal(servicio, "orders")).toBeNull();
    expect(featureRefusal(carta, "menu")).toBeNull();
  });
  it("says the plan lacks a module", () => {
    expect(featureRefusal(carta, "tables")).toBe("Tu plan no incluye Mesas.");
    expect(featureRefusal(servicio, "analytics")).toBe("Tu plan no incluye Análisis.");
  });
  it("says the access is paused when billing is locked, even on a plan that has the module", () => {
    expect(featureRefusal(lapsed, "orders")).toMatch(/pausado/);
  });
});

describe("server actions of the paid modules", () => {
  const denied = /no incluye|pausado/;

  it.each([
    ["Carta plan", carta],
    ["lapsed subscription", lapsed],
  ])("refuse a %s before touching any data", async (_label, restaurant) => {
    session(restaurant);
    const results = [
      await createTable({ name: "M1", capacity: 2, shape: "square", zone: "salon" } as never),
      await deleteTable("t1"),
      await createReservation({} as never),
      await createOrder({ customerName: "Ana", channel: "dine_in", items: [{ menuItemId: "x", quantity: 1 }] }),
      await updateOrderStatus("o1", "ready"),
      await sendComanda({ channel: "dine_in", lines: [{ menuItemId: "x", quantity: 1 }] } as never),
      await payOrder({} as never),
      await retryEmission("o1"),
      await voidOrder("o1"),
      await saveBillingSettings({} as never),
      await uploadCertificate({} as never),
      await testOseConnection(),
    ];
    for (const result of results) {
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toMatch(denied);
    }
    expect(await getKitchenOrders()).toEqual([]);
    for (const model of ["restaurantTable", "reservation", "order", "menuItem", "receiptSettings"] as const) {
      for (const fn of Object.values(mocks.prisma[model])) expect(fn).not.toHaveBeenCalled();
    }
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("let a venue whose plan and billing allow it carry on", async () => {
    // Past the gate each action reaches its own input validation, which is
    // exactly what it did before the gate existed.
    const result = await createTable({ name: "", capacity: 2, shape: "square", zone: "salon" } as never);
    expect(result).toEqual({ ok: false, error: "El nombre es obligatorio" });
    const order = await createOrder({ customerName: "", channel: "dine_in", items: [] } as never);
    expect((order as { error: string }).error).not.toMatch(denied);
    mocks.prisma.order.findMany.mockResolvedValue([]);
    expect(await getKitchenOrders()).toEqual([]);
    expect(mocks.prisma.order.findMany).toHaveBeenCalledTimes(1);
  });

  it("keep a paid-through-the-period cancelled venue working until its date", async () => {
    const until = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    session({ ...servicio, billingSource: "provider", billingStatus: "cancelled", accessUntil: until });
    const result = await createTable({ name: "", capacity: 2, shape: "square", zone: "salon" } as never);
    expect(result).toEqual({ ok: false, error: "El nombre es obligatorio" });
  });
});

describe("withApi feature option", () => {
  const venueRow = (restaurant: object) => {
    mocks.verify.mockResolvedValue({ sub: "owner", sessionVersion: 1, restaurantId: "venue" });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "owner", email: owner.email, role: "restaurant_owner", sessionVersion: 1 });
    mocks.prisma.restaurant.findMany.mockResolvedValue([restaurant]);
    (mocks.prisma as unknown as { staffMembership: { findMany: ReturnType<typeof vi.fn> } }).staffMembership.findMany =
      vi.fn().mockResolvedValue([]);
  };
  const call = (route: ReturnType<typeof withApi>) =>
    route({ url: "http://localhost/api/billing/cdrs" } as never, { params: Promise.resolve({}) });

  it("answers 403 to a venue without the module and never runs the handler", async () => {
    venueRow(carta);
    const handler = vi.fn(async () => ({ hello: "world" }));
    const response = await call(withApi(handler, { feature: "orders" }));
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toMatch(/no incluye/);
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 403 to a venue whose billing is locked", async () => {
    venueRow(lapsed);
    const handler = vi.fn(async () => ({}));
    const response = await call(withApi(handler, { feature: "orders" }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler for an entitled venue, and for routes that ask for no feature", async () => {
    venueRow(servicio);
    const handler = vi.fn(async () => ({ hello: "world" }));
    expect((await call(withApi(handler, { feature: "orders" }))).status).toBe(200);
    venueRow(carta);
    expect((await call(withApi(handler))).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe("staff seats", () => {
  const withRoles = () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({ id: "staff-user" });
    mocks.prisma.user.delete.mockResolvedValue({});
    mocks.prisma.staffMembership.count.mockResolvedValue(3);
    mocks.prisma.staffMembership.findUnique.mockResolvedValue(null);
    mocks.prisma.subscription.findFirst.mockResolvedValue(null);
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    mocks.prisma.$transaction.mockImplementation(async (fn: (tx: typeof mocks.prisma) => unknown) => fn(mocks.prisma));
  };

  it("adds a member while a seat is free and takes the lock on the venue first", async () => {
    withRoles();
    expect(await addStaffMember({ email: "mozo@example.test" })).toEqual({ ok: true, data: undefined });
    expect(mocks.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.staffMembership.create).toHaveBeenCalledTimes(1);
  });

  it("refuses when the count under the lock shows the cap was reached meanwhile, and drops the account it just made", async () => {
    withRoles();
    // The early check sees room; by the time the lock is held another invite
    // has taken the last seat.
    mocks.prisma.staffMembership.count.mockResolvedValueOnce(8).mockResolvedValueOnce(9);
    const result = await addStaffMember({ email: "mozo@example.test" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/llega hasta 10 usuarios/);
    expect(mocks.prisma.staffMembership.create).not.toHaveBeenCalled();
    expect(mocks.prisma.user.delete).toHaveBeenCalledWith({ where: { id: "staff-user" } });
  });

  it("applies the lower cap of a scheduled downgrade from the day it is scheduled", async () => {
    withRoles();
    mocks.prisma.staffMembership.count.mockResolvedValue(0);
    // Servicio today, a downgrade to Carta (owner alone) already scheduled.
    mocks.prisma.subscription.findFirst.mockResolvedValue({ pendingPlan: "carta" });
    const result = await addStaffMember({ email: "mozo@example.test" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/cambio al plan Carta programado/);
    expect(mocks.prisma.staffMembership.create).not.toHaveBeenCalled();
  });
});
