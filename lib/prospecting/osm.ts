// OpenStreetMap through the public Overpass API — the free prospecting
// source. No key, no billing, no card. The trade-off, measured on
// 2026-10-26: plenty of venues (642 in Miraflores, 305 in Los Olivos) but few
// phones (166 and 12) and almost no mobiles, and no ratings at all. Good for
// a visit route and for calling landlines; Google Places is the upgrade.
//
// Overpass is run by volunteers: one request per district, an honest
// User-Agent, and a second public instance when the first is busy (it
// answers 429/502/504 under load).
//
// Server only.

import type { Place } from "./places";
import { OSM_RELATION, type Segment } from "./searches";
import { peruMobile } from "./score";

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const USER_AGENT = "FoodFlow/1.0 (+https://foodflow.site)";
// Overpass area ids are relation ids offset by this constant.
const AREA_OFFSET = 3_600_000_000;

type Element = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
};

export type OsmPlace = Place & { segment: Segment };

export class OsmError extends Error {}

// The first cuisine value, in the words a Lima owner uses.
const CUISINE_LABELS: Record<string, string> = {
  peruvian: "Comida peruana",
  ceviche: "Cevichería",
  seafood: "Mariscos",
  chinese: "Chifa",
  chicken: "Pollería",
  pizza: "Pizzería",
  burger: "Hamburguesas",
  sandwich: "Sanguchería",
  sushi: "Sushi",
  japanese: "Comida japonesa",
  italian: "Comida italiana",
  regional: "Comida regional",
  steak_house: "Parrilla",
  grill: "Parrilla",
  coffee_shop: "Cafetería",
  breakfast: "Desayunos",
  ice_cream: "Heladería",
  vegetarian: "Vegetariano",
};

const AMENITY_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Cafetería",
  fast_food: "Comida rápida",
};

function firstOf(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function tag(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) if (tags[key]?.trim()) return tags[key].trim();
  return null;
}

/** Which of FoodFlow's four kinds of venue an OSM element is. */
export function osmSegment(tags: Record<string, string>): Segment {
  const cuisine = firstOf(tags.cuisine).map((c) => c.toLowerCase());
  const name = (tags.name ?? "").toLowerCase();
  // No \b: in a non-unicode regex "ú" is not a word character, so "menú\b"
  // never matches.
  if (/(^|[^a-z])men[uú]([^a-z]|$)/.test(name)) return "menu";
  if (cuisine.includes("chicken") || /poller|pollos|chicken|broaster/.test(name)) return "delivery";
  if (tags.amenity === "cafe" || cuisine.some((c) => ["coffee_shop", "cafe", "breakfast", "brunch", "juice"].includes(c))) return "cafe";
  if (tags.amenity === "fast_food") return "delivery";
  return "mesas";
}

/** A phone worth showing: a mobile when the venue lists one, else the first. */
export function osmPhone(tags: Record<string, string>): string | null {
  const all = ["contact:whatsapp", "contact:mobile", "phone", "contact:phone", "mobile"].flatMap((key) => firstOf(tags[key]));
  return all.find((p) => peruMobile(p)) ?? all[0] ?? null;
}

/** Their own site, or failing that a social profile (normalised to a URL). */
export function osmWebsite(tags: Record<string, string>): string | null {
  const site = tag(tags, "website", "contact:website", "url");
  if (site) return /^https?:\/\//i.test(site) ? site : `https://${site}`;
  const instagram = tag(tags, "contact:instagram", "instagram");
  if (instagram) return /^https?:\/\//i.test(instagram) ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`;
  const facebook = tag(tags, "contact:facebook", "facebook");
  if (facebook) return /^https?:\/\//i.test(facebook) ? facebook : `https://facebook.com/${facebook}`;
  return null;
}

export function toOsmPlace(el: Element, district: string): OsmPlace | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const cuisine = firstOf(tags.cuisine)[0]?.toLowerCase();
  const yesNo = (value: string | undefined) => (value === "yes" ? true : value === "no" ? false : null);

  return {
    id: `osm:${el.type}/${el.id}`,
    name,
    address: street ? `${street}, ${district}` : null,
    phone: osmPhone(tags),
    website: osmWebsite(tags),
    // A Google Maps search, not the OSM page: that is where the reviews and,
    // often, the WhatsApp number the map lacks can be checked in one tap.
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${district}, Lima`)}`,
    category: (cuisine && CUISINE_LABELS[cuisine]) ?? AMENITY_LABELS[tags.amenity ?? ""] ?? null,
    rating: null,
    reviewCount: null,
    open: true,
    delivery: yesNo(tags.delivery),
    // A restaurant or café has tables by definition; fast food only if it says so.
    dineIn: tags.amenity === "fast_food" ? yesNo(tags.indoor_seating) : true,
    chain: Boolean(tags.brand || tags["brand:wikidata"]),
    segment: osmSegment(tags),
  };
}

function districtQuery(district: string): string {
  const relation = OSM_RELATION[district];
  if (!relation) throw new OsmError(`Distrito sin límite en OpenStreetMap: ${district}`);
  return `[out:json][timeout:50];nwr["amenity"~"^(restaurant|cafe|fast_food)$"](area:${AREA_OFFSET + relation});out tags;`;
}

/** Every named eating place inside one district. One request. */
export async function fetchOsmDistrict(district: string): Promise<OsmPlace[]> {
  const query = districtQuery(district);
  let lastError = "sin respuesta";

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(40_000),
        cache: "no-store",
      });
      if (!response.ok) {
        lastError = `Overpass respondió ${response.status}`;
        continue;
      }
      const data = (await response.json()) as { elements?: Element[] };
      return (data.elements ?? []).map((el) => toOsmPlace(el, district)).filter((p): p is OsmPlace => p !== null);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new OsmError(`OpenStreetMap no respondió (${lastError}). Prueba en unos minutos.`);
}
