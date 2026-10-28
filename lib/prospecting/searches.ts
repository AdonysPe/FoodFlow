// What the prospecting job searches for: every Lima district Adonis picked
// (2026-10-22: Lima moderna, norte y este, centro y Callao) crossed with the
// terms that find each kind of venue on Google Maps. Pure data and pure
// functions — no I/O, so the rotation is testable.

export type Segment = "mesas" | "cafe" | "delivery" | "menu";

export const SEGMENT_LABELS: Record<Segment, string> = {
  mesas: "Con mesas y mozos",
  cafe: "Cafeterías y brunch",
  delivery: "Pollerías y delivery",
  menu: "Menú del día",
};

// What a person types into Maps. Few, distinct terms: near-synonyms
// ("restaurante" vs "restaurant") return the same places and only cost requests.
export const SEGMENT_TERMS: Record<Segment, string[]> = {
  mesas: ["cevichería", "restaurante criollo", "chifa"],
  cafe: ["cafetería"],
  delivery: ["pollería"],
  menu: ["menú del día"],
};

export const DISTRICT_GROUPS: { label: string; districts: string[] }[] = [
  {
    label: "Lima moderna",
    districts: ["Miraflores", "San Isidro", "Barranco", "Santiago de Surco", "San Borja", "Jesús María", "Magdalena del Mar", "Lince"],
  },
  {
    label: "Lima norte y este",
    districts: ["Los Olivos", "San Martín de Porres", "Independencia", "San Juan de Lurigancho", "Ate", "La Molina"],
  },
  {
    label: "Lima centro y Callao",
    districts: ["Cercado de Lima", "Breña", "La Victoria", "Pueblo Libre", "San Miguel", "Callao"],
  },
];

export const DISTRICTS = DISTRICT_GROUPS.flatMap((group) => group.districts);

// Each district's administrative boundary on OpenStreetMap (admin_level 8,
// inside the Lima and Callao provinces). Ids, not names: San Miguel,
// Independencia and La Victoria also exist in other regions, and matching by
// name also depends on how the accents are encoded. Cercado de Lima is
// called just "Lima" there.
export const OSM_RELATION: Record<string, number> = {
  Miraflores: 1944770,
  "San Isidro": 1944812,
  Barranco: 1944691,
  "Santiago de Surco": 1944844,
  "San Borja": 1944802,
  "Jesús María": 1944744,
  "Magdalena del Mar": 1944765,
  Lince: 1944757,
  "Los Olivos": 1944759,
  "San Martín de Porres": 1944821,
  Independencia: 1944743,
  "San Juan de Lurigancho": 1944815,
  Ate: 1944683,
  "La Molina": 1944745,
  "Cercado de Lima": 1944756,
  Breña: 1944693,
  "La Victoria": 1944748,
  "Pueblo Libre": 1944764,
  "San Miguel": 1944825,
  Callao: 1944699,
};

export type SearchQuery = {
  term: string;
  district: string;
  segment: Segment;
};

export function queryText(query: SearchQuery): string {
  // "Callao" is its own province; every other district reads better with Lima.
  const place = query.district === "Callao" ? "Callao, Perú" : `${query.district}, Lima, Perú`;
  return `${query.term} en ${place}`;
}

export function queryLabel(query: SearchQuery): string {
  return `${query.term} · ${query.district}`;
}

export function queriesFor(district: string, segment: Segment): SearchQuery[] {
  return SEGMENT_TERMS[segment].map((term) => ({ term, district, segment }));
}

/** Every district × every term, in a fixed order the rotation can index. */
export const ALL_QUERIES: SearchQuery[] = DISTRICTS.flatMap((district) =>
  (Object.keys(SEGMENT_TERMS) as Segment[]).flatMap((segment) => queriesFor(district, segment))
);

/** The daily cron's pace (app/api/cron/prospects): Google searches per run. */
export const CRON_SEARCHES_PER_DAY = 5;
/** Without a Google key the cron reads OpenStreetMap, a whole district at a time. */
export const CRON_OSM_DISTRICTS_PER_DAY = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily cron's share of the sweep. Stateless on purpose: day N runs
 * queries [N·perDay, N·perDay + perDay) modulo the list, so all of Lima comes
 * round every ALL_QUERIES.length / perDay days without a cursor to store or
 * lose. A skipped day just means that slice waits for the next lap.
 */
export function dailySlice(date: Date, perDay: number, all: SearchQuery[] = ALL_QUERIES): SearchQuery[] {
  const day = Math.floor(date.getTime() / DAY_MS);
  const start = (day * perDay) % all.length;
  return Array.from({ length: Math.min(perDay, all.length) }, (_, i) => all[(start + i) % all.length]);
}

/** The OpenStreetMap lap: the same stateless rotation, over districts. */
export function dailyDistricts(date: Date, perDay: number): string[] {
  const day = Math.floor(date.getTime() / DAY_MS);
  const start = (day * perDay) % DISTRICTS.length;
  return Array.from({ length: Math.min(perDay, DISTRICTS.length) }, (_, i) => DISTRICTS[(start + i) % DISTRICTS.length]);
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Text Search ranks by relevance, not by boundary: "cevichería en Lince" can
 * return a place in Jesús María. When the address names another district we
 * know, that one wins; otherwise the searched district stands.
 */
export function districtFromAddress(address: string | null | undefined, searched: string): string {
  if (!address) return searched;
  const haystack = fold(address);
  // Whole words only: "Ate" must not match "Av. Los Plateros".
  const mentions = (district: string) => new RegExp(`(^|[^a-z])${fold(district)}([^a-z]|$)`).test(haystack);
  if (mentions(searched)) return searched;
  // Longest first, so "San Juan de Lurigancho" is not read as "San Juan…".
  const hit = [...DISTRICTS].sort((a, b) => b.length - a.length).find(mentions);
  if (hit) return hit;
  // Google often writes Surco without "Santiago de".
  if (mentions("Surco")) return "Santiago de Surco";
  return searched;
}
