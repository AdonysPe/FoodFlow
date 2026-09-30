// A small in-memory stand-in for the Prisma client, covering exactly the
// query shapes lib/subscriptions uses: equality, null, `in`, `not`, `gt/lt/
// lte`, OR, `increment`, compound unique keys, orderBy (incl. nulls) and
// updateMany counts. Enough to run the real lifecycle end to end in tests —
// idempotency, ordering and transactions included — without a database.

import { Prisma } from "@prisma/client";

type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

let seq = 0;
const newId = (prefix: string) => `${prefix}${String(++seq).padStart(20, "0")}`;

function cmp(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : (a as number | string);
  const y = b instanceof Date ? b.getTime() : (b as number | string);
  return x < y ? -1 : x > y ? 1 : 0;
}

function eq(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  return (a ?? null) === (b ?? null);
}

function matchField(value: unknown, cond: unknown): boolean {
  if (cond === null) return value == null;
  if (cond instanceof Date || typeof cond !== "object") return eq(value, cond);
  const c = cond as Record<string, unknown>;
  for (const [op, arg] of Object.entries(c)) {
    switch (op) {
      case "in":
        if (!(arg as unknown[]).some((v) => eq(value, v))) return false;
        break;
      case "not":
        if (arg === null ? value == null : eq(value, arg)) return false;
        break;
      case "gt":
        if (value == null || cmp(value, arg) <= 0) return false;
        break;
      case "lt":
        if (value == null || cmp(value, arg) >= 0) return false;
        break;
      case "lte":
        if (value == null || cmp(value, arg) > 0) return false;
        break;
      case "gte":
        if (value == null || cmp(value, arg) < 0) return false;
        break;
      default:
        throw new Error(`fakePrisma: operator ${op} not supported`);
    }
  }
  return true;
}

function matches(row: Row, where: Where = {}): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as Where[]).some((w) => matches(row, w))) return false;
    } else if (key === "AND") {
      if (!(cond as Where[]).every((w) => matches(row, w))) return false;
    } else if (!matchField(row[key], cond)) {
      return false;
    }
  }
  return true;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const orders = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<string, unknown>[];
  return [...rows].sort((a, b) => {
    for (const order of orders) {
      const [field, spec] = Object.entries(order)[0];
      const dir = typeof spec === "string" ? spec : (spec as { sort: string }).sort;
      const nulls = typeof spec === "object" ? (spec as { nulls?: string }).nulls : undefined;
      const av = a[field];
      const bv = b[field];
      if (av == null || bv == null) {
        if (av == null && bv == null) continue;
        const nullFirst = nulls === "first" || (!nulls && dir === "asc");
        return (av == null) === nullFirst ? -1 : 1;
      }
      const r = cmp(av, bv);
      if (r !== 0) return dir === "desc" ? -r : r;
    }
    return 0;
  });
}

function applyData(row: Row, data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !(value instanceof Date) && "increment" in value) {
      row[key] = ((row[key] as number) ?? 0) + (value as { increment: number }).increment;
    } else if (value !== undefined) {
      row[key] = value;
    }
  }
  if ("updatedAt" in row) row.updatedAt = new Date();
}

function uniqueWhere(where: Where): Where {
  // Compound keys: { provider_providerPaymentId: { provider, providerPaymentId } }
  const out: Where = {};
  for (const [key, value] of Object.entries(where)) {
    if (key.includes("_") && value && typeof value === "object" && !(value instanceof Date)) {
      Object.assign(out, value);
    } else out[key] = value;
  }
  return out;
}

function table(name: string, prefix: string, defaults: () => Record<string, unknown>, uniques: string[][]) {
  const rows: Row[] = [];
  const violates = (candidate: Row, except?: Row) =>
    uniques.some((keys) =>
      rows.some(
        (row) =>
          row !== except &&
          keys.every((k) => candidate[k] != null && eq(row[k], candidate[k]))
      )
    );
  const dup = () =>
    new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${name}`, {
      code: "P2002",
      clientVersion: "test",
    });

  return {
    rows,
    async create({ data }: { data: Record<string, unknown> }) {
      const row = { id: newId(prefix), ...defaults(), createdAt: new Date(), updatedAt: new Date() } as Row;
      applyData(row, data);
      if (violates(row)) throw dup();
      rows.push(row);
      return { ...row };
    },
    async findUnique({ where }: { where: Where }) {
      const row = rows.find((r) => matches(r, uniqueWhere(where)));
      return row ? { ...row } : null;
    },
    async findFirst({ where, orderBy }: { where?: Where; orderBy?: unknown } = {}) {
      const row = sortRows(rows.filter((r) => matches(r, where)), orderBy)[0];
      return row ? { ...row } : null;
    },
    async findMany({ where, orderBy, take }: { where?: Where; orderBy?: unknown; take?: number } = {}) {
      return sortRows(rows.filter((r) => matches(r, where)), orderBy)
        .slice(0, take ?? Infinity)
        .map((r) => ({ ...r }));
    },
    async update({ where, data }: { where: Where; data: Record<string, unknown> }) {
      const row = rows.find((r) => matches(r, uniqueWhere(where)));
      if (!row) throw new Error(`fakePrisma: ${name} not found`);
      const next = { ...row };
      applyData(next, data);
      if (violates(next, row)) throw dup();
      Object.assign(row, next);
      return { ...row };
    },
    async updateMany({ where, data }: { where?: Where; data: Record<string, unknown> }) {
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) applyData(row, data);
      return { count: hit.length };
    },
    async count({ where }: { where?: Where } = {}) {
      return rows.filter((r) => matches(r, where)).length;
    },
    async deleteMany({ where }: { where?: Where } = {}) {
      const keep = rows.filter((r) => !matches(r, where));
      const count = rows.length - keep.length;
      rows.splice(0, rows.length, ...keep);
      return { count };
    },
  };
}

export function createFakePrisma() {
  const db = {
    restaurant: table("Restaurant", "ckrest", () => ({ billingSource: "none", billingStatus: "pending", accessUntil: null }), []),
    subscription: table(
      "Subscription",
      "cksub",
      () => ({
        status: "pending",
        currency: "PEN",
        discountBps: 0,
        trialDays: 0,
        trialUsedAt: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null,
        activatedAt: null,
        providerCanceledAt: null,
        lastPaymentAt: null,
        pendingPlan: null,
        pendingPlanEffectiveAt: null,
        replacesSubscriptionId: null,
        needsReview: false,
        reviewReason: null,
        providerSubscriptionId: null,
        providerCardId: null,
        providerCustomerId: null,
        cardBrand: null,
        cardLast4: null,
      }),
      [["provider", "providerSubscriptionId"]]
    ),
    subscriptionCheckout: table(
      "SubscriptionCheckout",
      "ckchk",
      () => ({ status: "created", purpose: "new", lockedUntil: null, attempts: 0, subscriptionId: null, failureCode: null, completedAt: null, lastReconciledAt: null }),
      [["restaurantId", "idempotencyKey"]]
    ),
    subscriptionPayment: table("SubscriptionPayment", "ckpay", () => ({ failureCode: null, eventId: null }), [
      ["provider", "providerPaymentId"],
    ]),
    subscriptionWebhookEvent: table(
      "SubscriptionWebhookEvent",
      "ckevt",
      () => ({ status: "received", attempts: 0, lockedUntil: null, subscriptionId: null, error: null, processedAt: null, receivedAt: new Date() }),
      [["provider", "providerEventId"]]
    ),
    subscriptionTransition: table("SubscriptionTransition", "cktr", () => ({}), []),
    staffMembership: table("StaffMembership", "ckstf", () => ({}), []),
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn(db);
    },
    async $queryRaw() {
      return [];
    },
  };
  return db;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
