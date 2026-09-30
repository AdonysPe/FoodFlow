// The single source of truth for what each commercial plan unlocks. The
// sidebar, the route guards, the admin picker and the upsell screens all read
// from here — change a plan's contents in one place.
//
// Plan names and prices mirror the public site (lib/i18n/dictionaries.js →
// chat.plans.items).

export const PLANS = ["carta", "servicio", "negocio"] as const;
export type PlanValue = (typeof PLANS)[number];

// Every gated capability in the client dashboard. A feature maps to one
// module/route; "menu" and "overview" are ungated (every plan has them).
export const FEATURES = [
  "menu",
  "overview",
  "tables",
  "comanda",
  "orders",
  "kitchen",
  "customers",
  "staff",
  "analytics",
  "own_ordering_website",
] as const;
export type FeatureValue = (typeof FEATURES)[number];

export const PLAN_LABELS: Record<PlanValue, string> = {
  carta: "Carta",
  servicio: "Servicio",
  negocio: "Negocio",
};

// The monthly price of each plan in céntimos, BEFORE IGV — the public site
// shows these followed by "+ IGV". This is the only place a price is a
// number: the checkout computes what it charges from here on the server, and
// the label below is derived from it so the two cannot drift.
export const PLAN_MONTHLY_NET_CENTS: Record<PlanValue, number> = {
  carta: 6900,
  servicio: 16900,
  negocio: 33900,
};

function soles(cents: number): string {
  return cents % 100 === 0 ? `S/ ${cents / 100}` : `S/ ${(cents / 100).toFixed(2)}`;
}

export const PLAN_PRICES: Record<PlanValue, string> = {
  carta: soles(PLAN_MONTHLY_NET_CENTS.carta),
  servicio: soles(PLAN_MONTHLY_NET_CENTS.servicio),
  negocio: soles(PLAN_MONTHLY_NET_CENTS.negocio),
};

export const PLAN_TAGLINES: Record<PlanValue, string> = {
  carta: "Para empezar a ordenar la carta",
  servicio: "El que usan la mayoría",
  negocio: "Para crecer o para varios locales",
};

// Cumulative by design — each plan is the previous one plus its own additions,
// which is exactly how the pricing page describes them ("Todo lo de Carta…").
const CARTA_FEATURES: FeatureValue[] = ["overview", "menu"];

const SERVICIO_FEATURES: FeatureValue[] = [
  ...CARTA_FEATURES,
  "tables",
  "comanda",
  "orders",
  "kitchen",
  "customers",
  "staff",
];

const NEGOCIO_FEATURES: FeatureValue[] = [...SERVICIO_FEATURES, "analytics", "own_ordering_website"];

export const PLAN_FEATURES: Record<PlanValue, FeatureValue[]> = {
  carta: CARTA_FEATURES,
  servicio: SERVICIO_FEATURES,
  negocio: NEGOCIO_FEATURES,
};

// How many people can use the dashboard, owner included. "1 usuario" on Carta
// means the owner alone — no waiters. Negocio is uncapped.
export const PLAN_MAX_USERS: Record<PlanValue, number> = {
  carta: 1,
  servicio: 10,
  negocio: Infinity,
};

export function planAllows(plan: PlanValue, feature: FeatureValue): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

// The cheapest plan that includes a feature — what an upsell screen offers.
export function firstPlanWith(feature: FeatureValue): PlanValue {
  return PLANS.find((p) => planAllows(p, feature)) ?? "negocio";
}

// Waiters the owner may still add (owner counts against the cap).
export function staffSeatsLeft(plan: PlanValue, currentStaff: number): number {
  const max = PLAN_MAX_USERS[plan];
  if (max === Infinity) return Infinity;
  return Math.max(0, max - 1 - currentStaff);
}

// One line per plan for the admin picker and the upsell copy.
export const PLAN_SUMMARIES: Record<PlanValue, string> = {
  carta: "Carta digital y QR. Solo el dueño.",
  servicio: "Comanda, cocina, mesas y equipo. Hasta 10 usuarios.",
  negocio: "Todo lo de Servicio más análisis de 30 días. Usuarios ilimitados.",
};

export const FEATURE_LABELS: Record<FeatureValue, string> = {
  own_ordering_website: "Web de pedidos",
  overview: "Resumen",
  menu: "Menú",
  tables: "Mesas",
  comanda: "Comanda",
  orders: "Pedidos",
  kitchen: "Cocina",
  customers: "Clientes",
  staff: "Equipo",
  analytics: "Análisis",
};

// Why each locked module is worth the upgrade — shown on the upsell screen.
export const FEATURE_PITCHES: Record<FeatureValue, string> = {
  own_ordering_website: "Tu propia web para recibir delivery y recojo con tu menú y tu cocina, sin comisión por pedido.",
  overview: "Las ventas y los pedidos del día de un vistazo.",
  menu: "Tu carta completa: categorías, precios y disponibilidad.",
  tables:
    "El plano de tu salón con el estado de cada mesa en vivo, más las reservas del día y de la semana.",
  comanda:
    "Los mozos toman el pedido desde el teléfono en tres toques, lo mandan a cocina y cobran en efectivo, tarjeta o Yape.",
  orders: "Todos los pedidos del día en una sola cola: salón, para llevar y delivery.",
  kitchen:
    "La pantalla de cocina con el cronómetro de cada pedido y las notas de cada plato.",
  customers: "Quién vuelve, cuánto pide y cuánto gasta.",
  staff: "Agrega a tus mozos para que tomen comandas con su propia cuenta.",
  analytics:
    "Tendencia de 30 días, platos más vendidos, horas pico y tasa de clientes que vuelven.",
};
