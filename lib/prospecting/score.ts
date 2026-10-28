// How good a fit a restaurant found on Google Maps is, from the facts Google
// publishes about it. Pure: the sync job and the tests call the same code.
//
// The score answers one question — "is this worth a message today?" — so it
// rewards what makes a first message land (a mobile number that has
// WhatsApp, a venue busy enough to feel the chaos FoodFlow fixes, no digital
// carta of its own yet) and zeroes the chains, whose owner is not the person
// who answers that phone.

import type { PlanValue } from "@/lib/plans";
import type { Segment } from "./searches";

export type PlaceFacts = {
  name: string;
  segment: Segment;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  delivery: boolean | null;
  dineIn: boolean | null;
};

/**
 * A Peru mobile is 9 digits starting with 9. Google writes it as
 * "987 654 321" or "+51 987 654 321"; a Lima landline is "(01) 4447777".
 * Returns the 9 digits, or null for a landline or anything else.
 */
export function peruMobile(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(national) ? national : null;
}

// Big Peruvian and international chains seen on Lima's map. Matched as whole
// words on the folded name, so "Tanta" does not catch "Tantamar".
const CHAINS = [
  "pardos",
  "norky's",
  "norkys",
  "roky's",
  "rokys",
  "bembos",
  "kfc",
  "starbucks",
  "popeyes",
  "mcdonald's",
  "mcdonalds",
  "burger king",
  "pizza hut",
  "papa john's",
  "papa johns",
  "domino's",
  "dominos",
  "china wok",
  "chili's",
  "juan valdez",
  "dunkin",
  "tanta",
  "panchita",
  "la lucha",
  "madam tusan",
  "don belisario",
  "mediterraneo chicken",
  "villa chicken",
  "las canastas",
  "papachos",
  "subway",
  "friday's",
  "segundo muelle",
];
// Left out on purpose: names that are also ordinary words in a venue's name
// ("La Mar" in "Rincón de la Mar", "Tambo", "Listo"). A missed chain only
// costs one message; a false hit buries a real prospect at score 0.

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function isChain(name: string): boolean {
  const folded = fold(name);
  return CHAINS.some((chain) => new RegExp(`(^|[^a-z'])${chain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z']|$)`).test(folded));
}

// A link-in-bio or a social profile is not a carta of their own: that venue
// still has the problem FoodFlow solves.
const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "linktr.ee", "wa.me", "whatsapp.com", "tiktok.com", "beacons.ai", "bio.link"];

export function hasOwnWebsite(website: string | null | undefined): boolean {
  if (!website) return false;
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    return !SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`));
  } catch {
    return false;
  }
}

/**
 * 0–100, in five parts that add up to exactly 100:
 *   reachable    30  mobile (WhatsApp) · 10 landline only · 0 no phone
 *   busy         25  50–1500 reviews · 12 for 20–49, 1501–4000 or unknown · 4 under 20
 *   liked        10  rating ≥ 4.3 · 6 for ≥ 4.0 · 5 unknown
 *   no own site  15  none or only social · 5 with a website of its own
 *   fit          20  10 each for dine-in and delivery
 * A chain scores 0, whatever the rest says.
 */
export function prospectScore(facts: PlaceFacts): number {
  if (isChain(facts.name)) return 0;

  const reachable = peruMobile(facts.phone) ? 30 : facts.phone ? 10 : 0;

  // Unknown is not zero: OpenStreetMap publishes no reviews at all, so a venue
  // from there gets the middle of the scale instead of the bottom.
  const reviews = facts.reviewCount;
  const busy =
    reviews == null
      ? 12
      : reviews >= 50 && reviews <= 1500
        ? 25
        : (reviews >= 20 && reviews < 50) || (reviews > 1500 && reviews <= 4000)
          ? 12
          : reviews > 4000
            ? 0
            : 4;

  const rating = facts.rating;
  const liked = rating == null ? 5 : rating >= 4.3 ? 10 : rating >= 4.0 ? 6 : 0;

  const site = hasOwnWebsite(facts.website) ? 5 : 15;

  const fit = (facts.dineIn ? 10 : 0) + (facts.delivery ? 10 : 0);

  return reachable + busy + liked + site + fit;
}

/**
 * The plan the first message should point at. Mirrors lib/plans.ts: Carta is
 * the menu alone, Servicio adds the floor (comanda, cocina, mesas), Negocio
 * adds the venue's own ordering website — the delivery pitch.
 */
export function suggestedPlan(facts: PlaceFacts): PlanValue {
  switch (facts.segment) {
    case "menu":
      return "carta";
    case "cafe":
      return facts.dineIn && (facts.reviewCount ?? 0) >= 300 ? "servicio" : "carta";
    case "delivery":
      return facts.delivery ? "negocio" : "servicio";
    case "mesas":
      return "servicio";
  }
}
