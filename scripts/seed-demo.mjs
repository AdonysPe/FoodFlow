/**
 * Demo data for the Tanta account.
 *
 * Tanta is the demo restaurant: the one we open to show the product working
 * with a full service behind it. This script rebuilds its transactional data
 * from scratch so every screen has something honest to render — a floor with
 * tables running, a kitchen with tickets, two months of sales behind the
 * analytics, a book of reservations and a handful of leads.
 *
 *   node scripts/seed-demo.mjs        (or: npm run db:seed-demo)
 *
 * It is safe to re-run: orders, reservations and customers for Tanta are
 * cleared first, and the menu and floor plan are matched by name rather than
 * duplicated. It refuses to touch any restaurant that is not called Tanta.
 *
 * Randomness is seeded, so a re-run produces the same demo — a screenshot
 * taken today still matches the account tomorrow.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();
const DEMO_RESTAURANT = "Tanta";

// Deterministic PRNG (mulberry32) — same demo on every run.
let seed = 20260904;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

// --------------------------------------------------------------- la carta
const MENU = {
  Entradas: [
    ["Causa limeña", 24, 10, "Papa amarilla, ají amarillo y pollo deshilachado."],
    ["Tiradito nikkei", 38, 12, "Pesca del día en leche de tigre nikkei."],
    ["Papa a la huancaína", 22, 8, "Clásico de la casa, con huevo y aceituna."],
    ["Anticuchos de corazón", 32, 14, "Dos brochetas con papa dorada y choclo."],
    ["Ceviche clásico", 42, 12, "Pesca del día, camote glaseado y canchita."],
  ],
  Principales: [
    ["Lomo Saltado", 39, 15, "Al wok, con papas fritas y arroz."],
    ["Ají de gallina", 36, 14, "Cremoso, con arroz graneado y aceituna."],
    ["Arroz con mariscos", 46, 18, "Con mariscos frescos y salsa criolla."],
    ["Seco de cordero", 44, 20, "Cocción lenta, frejoles y zarza."],
    ["Tacu tacu con lomo", 48, 18, "Tacu tacu de frejol canario y lomo saltado."],
    ["Chaufa de mariscos", 42, 15, "Arroz chaufa al wok con mariscos."],
    ["Pollo a la brasa (1/4)", 28, 16, "Con papas fritas y ensalada."],
  ],
  Guarniciones: [
    ["Yuca frita", 14, 8, "Con salsa huancaína."],
    ["Camote glaseado", 12, 8, null],
    ["Ensalada criolla", 12, 5, null],
    ["Arroz blanco", 8, 5, null],
  ],
  Bebidas: [
    ["Chicha morada", 10, 3, "Jarra personal, hecha en casa."],
    ["Limonada frozen", 12, 4, null],
    ["Inca Kola 500 ml", 8, 2, null],
    ["Pisco sour", 26, 6, "Pisco quebranta, limón y clara."],
    ["Cerveza artesanal", 18, 3, null],
  ],
  Postres: [
    ["Suspiro a la limeña", 18, 6, "Manjar blanco y merengue al oporto."],
    ["Picarones", 16, 10, "Cuatro unidades con miel de chancaca."],
    ["Torta de chocolate", 20, 5, null],
  ],
};

// Fotos de la carta demo. Están en public/demo/carta/ (descargadas de
// Wikimedia Commons por scripts/fetch-demo-photos.mjs, créditos en
// public/demo/carta/CREDITOS.md). Dos platos van sin foto a propósito: una
// carta real casi nunca las tiene todas, y así se ve cómo queda ese caso.
const PHOTOS = {
  "Causa limeña": "causa-limena",
  "Tiradito nikkei": "tiradito",
  "Papa a la huancaína": "papa-huancaina",
  "Anticuchos de corazón": "anticuchos",
  "Ceviche clásico": "ceviche",
  "Lomo Saltado": "lomo-saltado",
  "Ají de gallina": "aji-de-gallina",
  "Arroz con mariscos": "arroz-con-mariscos",
  "Tacu tacu con lomo": "tacu-tacu",
  "Chaufa de mariscos": "chaufa",
  "Pollo a la brasa (1/4)": "pollo-a-la-brasa",
  "Yuca frita": "yuca-frita",
  "Ensalada criolla": "ensalada-criolla",
  "Arroz blanco": "arroz-blanco",
  "Chicha morada": "chicha-morada",
  "Limonada frozen": "limonada",
  "Inca Kola 500 ml": "inca-kola",
  "Pisco sour": "pisco-sour",
  "Cerveza artesanal": "cerveza",
  "Suspiro a la limeña": "suspiro-limeno",
  Picarones: "picarones",
  "Torta de chocolate": "torta-chocolate",
};

const photoFor = (name) => (PHOTOS[name] ? `/demo/carta/${PHOTOS[name]}.webp` : null);

// ------------------------------------------------------------- el salón
const TABLES = [
  { name: "Mesa 1", capacity: 2, shape: "round", zone: "salon", x: 18, y: 22 },
  { name: "Mesa 2", capacity: 4, shape: "square", zone: "salon", x: 38, y: 20 },
  { name: "Mesa 3", capacity: 6, shape: "square", zone: "salon", x: 60, y: 22 },
  { name: "Mesa 5", capacity: 4, shape: "round", zone: "salon", x: 20, y: 50 },
  { name: "Mesa 6", capacity: 2, shape: "round", zone: "salon", x: 40, y: 50 },
  { name: "Mesa 9", capacity: 4, shape: "square", zone: "salon", x: 60, y: 50 },
  { name: "Mesa 4", capacity: 8, shape: "rect", zone: "terraza", x: 82, y: 24 },
  { name: "Mesa 7", capacity: 4, shape: "round", zone: "terraza", x: 82, y: 50 },
  { name: "Mesa 8", capacity: 6, shape: "rect", zone: "terraza", x: 82, y: 74 },
  { name: "Barra 1", capacity: 3, shape: "round", zone: "barra", x: 20, y: 80 },
  { name: "Barra 2", capacity: 2, shape: "round", zone: "barra", x: 36, y: 80 },
  { name: "Barra 3", capacity: 2, shape: "round", zone: "barra", x: 52, y: 80 },
];

// ------------------------------------------------------------- la gente
const NAMES = [
  "Ana Quispe", "Carlos Ramos", "Rosa Delgado", "Luis Fernández", "María Chávez",
  "Jorge Salazar", "Patricia Ríos", "Miguel Torres", "Lucía Paredes", "Diego Mendoza",
  "Carmen Vílchez", "Andrés Cornejo", "Sofía Bustamante", "Renzo Alarcón", "Valeria Núñez",
  "Gonzalo Ipanaqué", "Milagros Ochoa", "Fernando Zapata", "Claudia Rojas", "Piero Carrasco",
  "Elena Ascencio", "Bruno Villanueva", "Natalia Espinoza", "Óscar Palomino", "Rocío Camacho",
];
const NOTES = ["sin cebolla", "sin ají", "salsa aparte", "sin sal", "para llevar", "bien cocido"];

// Walk-ins. A real venue serves far more people once than it serves twice, so
// most orders draw a name from this pair of pools instead of from the 25
// regulars above — otherwise the recurrence rate reads like a members club.
const FIRST = [
  "Alonso", "Beatriz", "César", "Daniela", "Eduardo", "Fiorella", "Gabriel", "Helena",
  "Iván", "Julia", "Kevin", "Lorena", "Manuel", "Nadia", "Omar", "Paola", "Quique",
  "Ramiro", "Silvia", "Tomás", "Úrsula", "Víctor", "Wendy", "Ximena", "Yuri", "Zoila",
  "Alberto", "Brenda", "Cristian", "Débora",
];
const LAST = [
  "Aguilar", "Benavides", "Cabrera", "Durand", "Escobar", "Flores", "Gamarra", "Huamán",
  "Injoque", "Jiménez", "Loayza", "Medina", "Neves", "Olivares", "Pacheco", "Quiroz",
  "Reyes", "Sandoval", "Tapia", "Ugarte", "Valdez", "Wong", "Yactayo", "Zúñiga",
  "Arana", "Bravo", "Castillo", "Dueñas", "Effio", "Falcón",
];
const walkIn = () => `${pick(FIRST)} ${pick(LAST)}`;

function phone(i) {
  return `9${String(10000000 + i * 373711).slice(0, 8)}`;
}

function slug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/**
 * Anyone can self-register a restaurant named "Tanta" — the name has no
 * unique constraint, only the slug does. Matching by name alone could pick
 * a stranger's account and wipe their orders/reservations/customers, so this
 * looks up the slug first (safe once assigned) and only falls back to name
 * for the very first run — the one where this script itself still has to
 * assign that slug below — refusing to guess if more than one row matches.
 */
async function resolveDemoRestaurant() {
  const bySlug = await prisma.restaurant.findUnique({ where: { slug: "tanta" } });
  if (bySlug) return bySlug;

  const candidates = await prisma.restaurant.findMany({ where: { name: DEMO_RESTAURANT } });
  if (candidates.length === 0) {
    throw new Error(`No existe el restaurante "${DEMO_RESTAURANT}". Nada que sembrar.`);
  }
  if (candidates.length > 1) {
    throw new Error(
      `Hay ${candidates.length} restaurantes llamados "${DEMO_RESTAURANT}" y ninguno tiene el slug ` +
        `"tanta" todavía, así que no se puede saber cuál es la cuenta demo real. Verifica manualmente ` +
        `cuál es (ids: ${candidates.map((r) => r.id).join(", ")}) y asígnale el slug "tanta" antes de reintentar.`
    );
  }
  return candidates[0];
}

async function main() {
  const restaurant = await resolveDemoRestaurant();
  const R = restaurant.id;
  console.log(`Sembrando la cuenta demo: ${restaurant.name} (${R})`);

  // ------------------------------------------------- limpiar lo transaccional
  const wiped = {
    orders: (await prisma.order.deleteMany({ where: { restaurantId: R } })).count,
    reservations: (await prisma.reservation.deleteMany({ where: { restaurantId: R } })).count,
    customers: (await prisma.customer.deleteMany({ where: { restaurantId: R } })).count,
  };
  console.log("  limpiado:", JSON.stringify(wiped));

  // ------------------------------------------------------------------ carta
  const categories = new Map();
  let catOrder = 0;
  for (const name of Object.keys(MENU)) {
    const existing = await prisma.menuCategory.findFirst({ where: { restaurantId: R, name } });
    const cat =
      existing ??
      (await prisma.menuCategory.create({
        data: { restaurantId: R, name, sortOrder: catOrder },
      }));
    categories.set(name, cat.id);
    catOrder += 1;
  }

  const dishes = [];
  for (const [catName, rows] of Object.entries(MENU)) {
    let sortOrder = 0;
    for (const [name, price, prepMin, description] of rows) {
      const existing = await prisma.menuItem.findFirst({ where: { restaurantId: R, name } });
      const data = {
        restaurantId: R,
        categoryId: categories.get(catName),
        name,
        price,
        prepMin,
        description,
        sortOrder,
        available: true,
        photoUrl: photoFor(name),
      };
      const item = existing
        ? await prisma.menuItem.update({ where: { id: existing.id }, data })
        : await prisma.menuItem.create({ data });
      // Drinks and sides ride along with a main; they never anchor an order.
      dishes.push({ ...item, kind: catName });
      sortOrder += 1;
    }
  }
  // Anything left over from an earlier hand-made carta would sit next to the
  // seeded one as a near-duplicate, so the script owns the whole menu.
  const stale = await prisma.menuItem.deleteMany({
    where: { restaurantId: R, name: { notIn: dishes.map((d) => d.name) } },
  });
  console.log(
    `  carta: ${dishes.length} platos en ${categories.size} categorías` +
      (stale.count > 0 ? ` (${stale.count} plato(s) antiguo(s) retirado(s))` : "")
  );

  // ------------------------------------------------------------ carta pública
  // Address, header and opening hours for /carta/tanta. Published, because the
  // whole point of the demo account is that every screen already works.
  await prisma.restaurant.update({
    where: { id: R },
    data: { slug: "tanta", cartaVersion: { increment: 1 } },
  });
  const cartaData = {
    published: true,
    tagline: "Cocina peruana de siempre, en San Isidro",
    address: "Av. Pardo y Aliaga 202, San Isidro",
    whatsapp: "950360685",
    mapsUrl: null,
    logoUrl: null,
    hours: [
      { day: 0, closed: false, open: "12:00", close: "17:00" },
      { day: 1, closed: true, open: "12:00", close: "23:00" },
      { day: 2, closed: false, open: "12:30", close: "23:00" },
      { day: 3, closed: false, open: "12:30", close: "23:00" },
      { day: 4, closed: false, open: "12:30", close: "23:00" },
      { day: 5, closed: false, open: "12:30", close: "00:30" },
      { day: 6, closed: false, open: "12:00", close: "00:30" },
    ],
  };
  await prisma.cartaSettings.upsert({
    where: { restaurantId: R },
    create: { restaurantId: R, ...cartaData },
    update: cartaData,
  });
  console.log("  carta pública: /carta/tanta (publicada)");

  // ------------------------------------------------------------------ salón
  const tables = [];
  for (const t of TABLES) {
    const existing = await prisma.restaurantTable.findFirst({
      where: { restaurantId: R, name: t.name },
    });
    const data = { restaurantId: R, ...t, active: true, occupiedAt: null };
    tables.push(
      existing
        ? await prisma.restaurantTable.update({ where: { id: existing.id }, data })
        : await prisma.restaurantTable.create({ data })
    );
  }
  console.log(`  salón: ${tables.length} mesas`);

  // -------------------------------------------------------------- clientes
  await prisma.customer.createMany({
    data: NAMES.map((name, i) => ({
      restaurantId: R,
      name,
      phone: phone(i),
      email: i % 3 === 0 ? `${slug(name)}@gmail.com` : null,
    })),
  });
  console.log(`  clientes: ${NAMES.length}`);

  // ---------------------------------------------------------------- pedidos
  const mains = dishes.filter((d) => d.kind === "Principales" || d.kind === "Entradas");
  const extras = dishes.filter((d) => d.kind !== "Principales" && d.kind !== "Entradas");

  /** One plausible bill: one or two dishes plus a drink or a side. */
  function buildItems() {
    const lines = [];
    const count = between(1, 3);
    for (let i = 0; i < count; i += 1) {
      const dish = pick(mains);
      lines.push({
        name: dish.name,
        price: dish.price,
        quantity: between(1, 2),
        round: 1,
        ...(rnd() < 0.22 ? { note: pick(NOTES) } : {}),
      });
    }
    if (rnd() < 0.8) {
      const extra = pick(extras);
      lines.push({ name: extra.name, price: extra.price, quantity: between(1, 3), round: 1 });
    }
    return lines;
  }

  const history = [];
  // Nine weeks back, so the analytics page has eight full weeks plus today.
  for (let daysAgo = 62; daysAgo >= 1; daysAgo -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - daysAgo);
    const dow = day.getDay();
    // Friday and Saturday carry the week; Monday is the quiet day.
    const base = dow === 5 || dow === 6 ? 16 : dow === 0 ? 12 : dow === 1 ? 6 : 9;
    // A gentle climb over two months, which is what a pilot should look like.
    const growth = 1 + (62 - daysAgo) / 150;
    const count = Math.max(1, Math.round((base + rnd() * 4 - 2) * growth));

    for (let k = 0; k < count; k += 1) {
      const items = buildItems();
      const total = items.reduce((sum, l) => sum + l.price * l.quantity, 0);
      // Lunch service is the busy one, dinner the long one.
      const lunch = rnd() < 0.58;
      const when = new Date(day);
      when.setHours(lunch ? between(12, 15) : between(19, 22), between(0, 59), 0, 0);

      const channelRoll = rnd();
      const channel = channelRoll < 0.62 ? "dine_in" : channelRoll < 0.84 ? "delivery" : "pickup";
      const table = channel === "dine_in" ? pick(tables) : null;
      // Three in ten are regulars; the rest are people passing through.
      const person = rnd() < 0.3 ? pick(NAMES) : walkIn();

      history.push({
        restaurantId: R,
        customerName: channel === "dine_in" ? (rnd() < 0.35 ? person : table.name) : person,
        tableId: table?.id ?? null,
        channel,
        status: "delivered",
        roundNumber: 1,
        serverName: pick(["Carla", "Adonys", "Milagros"]),
        items,
        total,
        createdAt: when,
        // Ready ~ prep time after it landed, which is what the average prep
        // metric on the overview reads.
        readyAt: new Date(when.getTime() + between(9, 24) * 60000),
        paidAt: new Date(when.getTime() + between(35, 95) * 60000),
        paymentMethod: pick(["efectivo", "tarjeta", "yape", "yape"]),
      });
    }
  }
  await prisma.order.createMany({ data: history });
  console.log(`  histórico: ${history.length} pedidos pagados en 62 días`);

  // ------------------------------------------------- servicio de ahora mismo
  // Four tables running, one ticket per kitchen state, so the floor plan, the
  // service rail and the kitchen board all have something live to show.
  const byName = (n) => tables.find((t) => t.name === n);
  const live = [
    { table: "Mesa 3", who: "Carlos Ramos", minsAgo: 26, status: "pending", rounds: 2 },
    { table: "Mesa 4", who: "Familia Paredes", minsAgo: 14, status: "preparing", rounds: 1 },
    { table: "Barra 1", who: null, minsAgo: 6, status: "ready", rounds: 1 },
    { table: "Mesa 7", who: "Sofía Bustamante", minsAgo: 41, status: "preparing", rounds: 2 },
  ];

  for (const entry of live) {
    const table = byName(entry.table);
    if (!table) continue;
    const items = buildItems();
    if (entry.rounds > 1) {
      const second = pick(extras);
      items.push({ name: second.name, price: second.price, quantity: 2, round: 2 });
    }
    const when = new Date(Date.now() - entry.minsAgo * 60000);
    await prisma.order.create({
      data: {
        restaurantId: R,
        customerName: entry.who ?? table.name,
        tableId: table.id,
        channel: "dine_in",
        status: entry.status,
        roundNumber: entry.rounds,
        serverName: "Carla",
        items,
        total: items.reduce((sum, l) => sum + l.price * l.quantity, 0),
        createdAt: when,
        readyAt: entry.status === "ready" ? new Date() : null,
      },
    });
  }
  console.log(`  en servicio: ${live.length} mesas con cuenta abierta`);

  // ------------------------------------------------------------- reservas
  const isoDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
  };

  const reservations = [
    { offset: 0, time: "20:00", party: 6, table: "Mesa 3", who: "Jorge Salazar", status: "confirmada", source: "manual" },
    { offset: 0, time: "21:00", party: 4, table: "Mesa 7", who: "Valeria Núñez", status: "confirmada", source: "web" },
    { offset: 0, time: "13:30", party: 2, table: "Mesa 1", who: "Elena Ascencio", status: "sentada", source: "manual" },
    { offset: 0, time: "20:30", party: 8, table: "Mesa 4", who: "Renzo Alarcón", status: "pendiente", source: "web", notes: "Cumpleaños, llevan torta." },
    { offset: 1, time: "13:00", party: 4, table: "Mesa 2", who: "Patricia Ríos", status: "confirmada", source: "manual" },
    { offset: 1, time: "20:00", party: 2, table: "Mesa 6", who: "Diego Mendoza", status: "pendiente", source: "web" },
    { offset: 2, time: "14:00", party: 6, table: "Mesa 8", who: "Carmen Vílchez", status: "confirmada", source: "manual", notes: "Una silla de bebé." },
    { offset: 3, time: "20:30", party: 4, table: "Mesa 9", who: "Bruno Villanueva", status: "confirmada", source: "web" },
    { offset: 5, time: "21:00", party: 8, table: "Mesa 4", who: "Natalia Espinoza", status: "pendiente", source: "web", notes: "Cena de trabajo." },
  ];

  await prisma.reservation.createMany({
    data: reservations.map((r, i) => ({
      restaurantId: R,
      tableId: byName(r.table)?.id ?? null,
      customerName: r.who,
      customerPhone: phone(i + 3),
      date: isoDay(r.offset),
      startTime: r.time,
      durationMin: r.party > 5 ? 120 : 90,
      partySize: r.party,
      status: r.status,
      source: r.source,
      notes: r.notes ?? null,
    })),
  });
  console.log(`  reservas: ${reservations.length}`);

  // -------------------------------------------------------------- contactos
  // Leads live outside the restaurant (they are FoodFlow's own funnel), so
  // they are only topped up when the table is empty.
  if ((await prisma.lead.count()) === 0) {
    const now = Date.now();
    await prisma.lead.createMany({
      data: [
        { nombre: "Ana Quispe", restaurante: "Cevichería El Muelle", whatsapp: "987654321", email: "ana@elmuelle.pe", source: "calculadora", perdidaMensual: 3600, perdidaAnual: 43200, score: 100, status: "contactado", consentAt: new Date(now - 6 * 86400000), createdAt: new Date(now - 6 * 86400000) },
        { nombre: "Luis Fernández", restaurante: "Pollería Don Lucho", whatsapp: "987001122", source: "web_form", score: 0, status: "cita", consentAt: new Date(now - 4 * 86400000), createdAt: new Date(now - 4 * 86400000) },
        { nombre: "Milagros Ochoa", restaurante: "Sazón de Barranco", whatsapp: "987334455", email: "milagros@sazon.pe", source: "calculadora", perdidaMensual: 1800, perdidaAnual: 21600, score: 72, status: "nuevo", consentAt: new Date(now - 2 * 86400000), createdAt: new Date(now - 2 * 86400000) },
        { nombre: "Piero Carrasco", restaurante: "Chifa Wok Perú", whatsapp: "987556677", source: "web_form", score: 0, status: "nuevo", consentAt: new Date(now - 86400000), createdAt: new Date(now - 86400000) },
        { nombre: "Rocío Camacho", restaurante: "Café Miraflores", whatsapp: "987778899", email: "rocio@cafemiraflores.pe", source: "calculadora", perdidaMensual: 900, perdidaAnual: 10800, score: 36, status: "archivado", consentAt: new Date(now - 20 * 86400000), createdAt: new Date(now - 20 * 86400000) },
      ],
    });
    console.log("  contactos: 5 leads");
  } else {
    console.log("  contactos: ya había leads, no se tocaron");
  }

  const totals = {
    pedidos: await prisma.order.count({ where: { restaurantId: R } }),
    abiertos: await prisma.order.count({ where: { restaurantId: R, paidAt: null, voidedAt: null } }),
    mesas: await prisma.restaurantTable.count({ where: { restaurantId: R } }),
    platos: await prisma.menuItem.count({ where: { restaurantId: R } }),
    clientes: await prisma.customer.count({ where: { restaurantId: R } }),
    reservas: await prisma.reservation.count({ where: { restaurantId: R } }),
  };
  console.log("Listo:", JSON.stringify(totals));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
