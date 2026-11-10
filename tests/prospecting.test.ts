import { describe, expect, it } from "vitest";
import { hasOwnWebsite, isChain, peruMobile, prospectScore, suggestedPlan, type PlaceFacts } from "@/lib/prospecting/score";
import { MAX_TOUCHES, draftMessage, nextFollowUpAt, whatsappLink } from "@/lib/prospecting/message";
import { createData, instagramHandle, socialPlaceId, updateData } from "@/lib/prospecting/social";
import { AGENT_DISTRICTS, MAX_AGENT_DISTRICTS, agentUpdateSchema } from "@/lib/prospecting/agent";
import { ALL_QUERIES, DISTRICTS, OSM_RELATION, dailyDistricts, dailySlice, districtFromAddress, queryText } from "@/lib/prospecting/searches";
import { osmPhone, osmSegment, osmWebsite, toOsmPlace } from "@/lib/prospecting/osm";

const base: PlaceFacts = {
  name: "Cevichería El Muelle",
  segment: "mesas",
  phone: "987 654 321",
  rating: 4.6,
  reviewCount: 320,
  website: null,
  delivery: true,
  dineIn: true,
};

describe("peruMobile", () => {
  it("reads the national and international forms of a mobile", () => {
    expect(peruMobile("987 654 321")).toBe("987654321");
    expect(peruMobile("+51 987 654 321")).toBe("987654321");
  });
  it("rejects landlines and empty values", () => {
    expect(peruMobile("(01) 4447777")).toBeNull();
    expect(peruMobile("01 4447777")).toBeNull();
    expect(peruMobile(null)).toBeNull();
  });
});

describe("isChain", () => {
  it("catches the big chains as whole words", () => {
    expect(isChain("Pardos Chicken - Miraflores")).toBe(true);
    expect(isChain("Norky's Los Olivos")).toBe(true);
    expect(isChain("Tanta Larcomar")).toBe(true);
  });
  it("does not catch a name that merely contains one", () => {
    expect(isChain("Tantamar Cevichería")).toBe(false);
    expect(isChain("Rincón de la Mar")).toBe(false);
  });
});

describe("hasOwnWebsite", () => {
  it("treats social profiles and link-in-bio as no website", () => {
    expect(hasOwnWebsite("https://www.instagram.com/elmuelle")).toBe(false);
    expect(hasOwnWebsite("https://linktr.ee/elmuelle")).toBe(false);
    expect(hasOwnWebsite(null)).toBe(false);
  });
  it("recognises a real domain", () => {
    expect(hasOwnWebsite("https://elmuelle.pe/carta")).toBe(true);
  });
});

describe("prospectScore", () => {
  it("gives the ideal prospect the full 100", () => {
    expect(prospectScore(base)).toBe(100);
  });
  it("never goes above 100 or below 0", () => {
    const worst = prospectScore({ ...base, phone: null, rating: 2, reviewCount: 9000, website: "https://x.pe", delivery: false, dineIn: false });
    expect(worst).toBeGreaterThanOrEqual(0);
    expect(worst).toBeLessThanOrEqual(100);
  });
  it("ranks a landline-only venue below a WhatsApp one", () => {
    expect(prospectScore({ ...base, phone: "(01) 4447777" })).toBeLessThan(prospectScore(base));
  });
  it("zeroes a chain", () => {
    expect(prospectScore({ ...base, name: "Bembos Larcomar" })).toBe(0);
  });
});

describe("suggestedPlan", () => {
  it("follows the plan ladder in lib/plans.ts", () => {
    expect(suggestedPlan({ ...base, segment: "menu" })).toBe("carta");
    expect(suggestedPlan({ ...base, segment: "mesas" })).toBe("servicio");
    expect(suggestedPlan({ ...base, segment: "delivery", delivery: true })).toBe("negocio");
    expect(suggestedPlan({ ...base, segment: "delivery", delivery: false })).toBe("servicio");
    expect(suggestedPlan({ ...base, segment: "cafe", reviewCount: 40 })).toBe("carta");
  });
});

describe("draftMessage", () => {
  const facts = { name: "Cevichería El Muelle", segment: "mesas" as const, rating: 4.6, reviewCount: 320, source: "google" as const, district: "Miraflores" };

  it("names the venue, quotes only Google's own numbers and offers a way out", () => {
    const first = draftMessage(facts, 0);
    expect(first).toContain("Cevichería El Muelle");
    expect(first).toContain("4,6 con 320 reseñas");
    expect(first).toContain("el primer mes es gratis y los 6 meses siguientes pagas la mitad");
    expect(first).toContain("5 restaurantes fundadores");
    expect(first).toContain("no te vuelvo a escribir");
  });
  it("leaves the rating out when it would not flatter", () => {
    expect(draftMessage({ ...facts, rating: 3.9 }, 0)).not.toContain("reseñas");
  });
  it("has a distinct message for each touch", () => {
    const all = [0, 1, 2].map((t) => draftMessage(facts, t));
    expect(new Set(all).size).toBe(MAX_TOUCHES);
  });
  it("encodes the draft into the wa.me link", () => {
    expect(whatsappLink("987654321", "Hola, ¿qué tal?")).toBe("https://wa.me/51987654321?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
  });
});

describe("nextFollowUpAt", () => {
  const sent = new Date("2026-10-01T15:00:00Z");
  it("schedules day 3 after the first message and day 7 after the second", () => {
    expect(nextFollowUpAt(1, sent)?.toISOString()).toBe("2026-10-04T15:00:00.000Z");
    expect(nextFollowUpAt(2, new Date("2026-10-04T15:00:00Z"))?.toISOString()).toBe("2026-10-08T15:00:00.000Z");
  });
  it("stops after the third message and before the first", () => {
    expect(nextFollowUpAt(3, sent)).toBeNull();
    expect(nextFollowUpAt(0, null)).toBeNull();
  });
});

describe("search rotation", () => {
  it("covers every query once per lap", () => {
    const perDay = 5;
    const days = Math.ceil(ALL_QUERIES.length / perDay);
    const start = new Date("2026-10-22T13:00:00Z").getTime();
    const seen = new Set<string>();
    for (let d = 0; d < days; d++) {
      for (const q of dailySlice(new Date(start + d * 86_400_000), perDay)) seen.add(queryText(q));
    }
    expect(seen.size).toBe(ALL_QUERIES.length);
  });
  it("writes Callao without Lima", () => {
    expect(queryText({ term: "chifa", district: "Callao", segment: "mesas" })).toBe("chifa en Callao, Perú");
  });
});

describe("districtFromAddress", () => {
  it("keeps the searched district when the address names it", () => {
    expect(districtFromAddress("Av. Larco 123, Miraflores 15074, Perú", "Miraflores")).toBe("Miraflores");
  });
  it("moves a place to the district its address names", () => {
    expect(districtFromAddress("Jr. Huiracocha 1500, Jesús María 15072", "Lince")).toBe("Jesús María");
    expect(districtFromAddress("Av. Primavera 200, Surco 15023", "San Borja")).toBe("Santiago de Surco");
  });
  it("does not read a district inside another word", () => {
    expect(districtFromAddress("Av. Los Plateros 120, Lima", "La Molina")).toBe("La Molina");
  });
});

describe("OpenStreetMap source", () => {
  it("reads unknown reviews and rating as the middle, not the bottom", () => {
    const unknown = prospectScore({ ...base, rating: null, reviewCount: null });
    const few = prospectScore({ ...base, rating: 3.5, reviewCount: 5 });
    expect(unknown).toBeGreaterThan(few);
    expect(unknown).toBeLessThan(prospectScore(base));
  });

  it("sorts places into FoodFlow's four kinds", () => {
    expect(osmSegment({ amenity: "cafe", name: "Café Ejemplo" })).toBe("cafe");
    expect(osmSegment({ amenity: "restaurant", cuisine: "chicken", name: "Ejemplo" })).toBe("delivery");
    expect(osmSegment({ amenity: "restaurant", name: "Pollería Ejemplo" })).toBe("delivery");
    expect(osmSegment({ amenity: "restaurant", name: "Menú Doña Ejemplo" })).toBe("menu");
    expect(osmSegment({ amenity: "restaurant", cuisine: "peruvian", name: "Ejemplo" })).toBe("mesas");
  });

  it("prefers a mobile among several phones", () => {
    expect(osmPhone({ phone: "+51 1 4447777;+51 987 654 321" })).toBe("+51 987 654 321");
    expect(osmPhone({ "contact:phone": "+51 1 4447777" })).toBe("+51 1 4447777");
    expect(osmPhone({})).toBeNull();
  });

  it("turns handles into links", () => {
    expect(osmWebsite({ "contact:instagram": "@ejemplo" })).toBe("https://instagram.com/ejemplo");
    expect(osmWebsite({ website: "ejemplo.pe" })).toBe("https://ejemplo.pe");
  });

  it("maps an element into a prospect place", () => {
    const place = toOsmPlace(
      { type: "node", id: 42, tags: { name: "Ejemplo", amenity: "restaurant", cuisine: "ceviche", brand: "Ejemplo SAC", "addr:street": "Av. Larco", "addr:housenumber": "100" } },
      "Miraflores"
    );
    expect(place).toMatchObject({ id: "osm:node/42", category: "Cevichería", address: "Av. Larco 100, Miraflores", rating: null, chain: true, segment: "mesas" });
    expect(toOsmPlace({ type: "node", id: 1, tags: { amenity: "cafe" } }, "Miraflores")).toBeNull();
  });

  it("has a boundary for every district and covers them all in one lap", () => {
    for (const d of DISTRICTS) expect(OSM_RELATION[d]).toBeGreaterThan(0);
    const seen = new Set<string>();
    const start = new Date("2026-10-26T13:00:00Z").getTime();
    for (let i = 0; i < Math.ceil(DISTRICTS.length / 2); i++) for (const d of dailyDistricts(new Date(start + i * 86_400_000), 2)) seen.add(d);
    expect(seen.size).toBe(DISTRICTS.length);
  });

  it("does not claim Google Maps in the message for an OSM row", () => {
    const msg = draftMessage({ name: "Ejemplo", segment: "mesas", rating: null, reviewCount: null, source: "osm", district: "Barranco" }, 0);
    expect(msg).not.toContain("Google Maps");
    expect(msg).toContain("buscando restaurantes en Barranco");
  });
});

describe("prospección por redes", () => {
  const item = {
    name: "Cevichería Barra YAJY",
    district: "San Juan de Lurigancho",
    instagram: "https://www.instagram.com/Barra_YAJYSJL_/?hl=es",
    phone: "945 339 422",
    segment: "mesas" as const,
    followers: 2100,
    delivery: true,
    dineIn: true,
  };

  it("reads an Instagram handle from a URL, an @ or a bare name, and rejects post links", () => {
    expect(instagramHandle(item.instagram)).toBe("barra_yajysjl_");
    expect(instagramHandle("@Punto29")).toBe("punto29");
    expect(instagramHandle("https://www.instagram.com/reel/DTfvXCZAIPX/")).toBeNull();
    expect(instagramHandle("")).toBeNull();
  });

  it("keys a venue by its Instagram, then its Facebook page, then its name", () => {
    expect(socialPlaceId(item)).toBe("ig:barra_yajysjl_");
    expect(socialPlaceId({ ...item, instagram: null, facebook: "https://m.facebook.com/BRASAS22/?ref=x" })).toBe("fb:brasas22");
    expect(socialPlaceId({ ...item, instagram: null, facebook: null })).toBe("redes:cevicheria barra yajy|san juan de lurigancho");
  });

  it("creates a 'redes' row with the mobile read off the phone", () => {
    const data = createData(item);
    expect(data.source).toBe("redes");
    expect(data.mobile).toBe("945339422");
    expect(data.instagram).toBe("barra_yajysjl_");
    expect(data.score).toBeGreaterThan(80);
  });

  it("scores followers when there are no reviews", () => {
    const base = { name: "X", segment: "mesas" as const, phone: "987654321", rating: null, reviewCount: null, website: null, delivery: true, dineIn: true };
    expect(prospectScore({ ...base, followers: 2100 })).toBeGreaterThan(prospectScore({ ...base, followers: 150 }));
    expect(prospectScore({ ...base, followers: 500 })).toBe(prospectScore(base));
  });

  it("enriches an OpenStreetMap row without touching its pipeline or a mobile it had", () => {
    const existing = {
      id: "p1", placeId: "osm:node/1", source: "osm", name: "Barra YAJY", district: "San Juan de Lurigancho", address: null,
      phone: null, mobile: null, website: null, mapsUrl: null, category: "Restaurante", segment: "mesas", rating: null, reviewCount: null,
      delivery: null, dineIn: null, score: 42, suggestedPlan: "servicio", isChain: false, status: "contactado", touches: 1, lastTouchAt: new Date(),
      foundBy: "OSM", createdAt: new Date(), updatedAt: new Date(), instagram: null, facebook: null, tiktok: null, followers: null, notes: null, opener: null,
    } as const;
    const data = updateData({ ...item, opener: "Hola" }, existing as never);
    expect(data.mobile).toBe("945339422");
    expect(data.instagram).toBe("barra_yajysjl_");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("touches");
    expect(data.opener).toBeNull(); // the first message already went out
    const kept = updateData({ ...item, phone: "999888777" }, { ...existing, mobile: "911222333", phone: "911 222 333" } as never);
    expect(kept.mobile).toBe("911222333");
  });

  it("uses the agent's opener and adds the way out when it is missing", () => {
    const facts = { name: "Barra YAJY", segment: "mesas" as const, rating: null, reviewCount: null, source: "redes" as const, district: "San Juan de Lurigancho", network: "Instagram" as const };
    expect(draftMessage({ ...facts, opener: "Hola, vi sus ceviches en Instagram." }, 0)).toBe(
      "Hola, vi sus ceviches en Instagram. Si no te interesa, dímelo y no te vuelvo a escribir."
    );
    expect(draftMessage(facts, 0)).toContain("Vi Barra YAJY en Instagram");
  });
});

describe("agente de redes · configuración", () => {
  it("accepts one to four known districts and drops repeats", () => {
    const ok = agentUpdateSchema.safeParse({ districts: ["San Juan de Lurigancho", "El Agustino", "San Juan de Lurigancho"] });
    expect(ok.success && ok.data.districts).toEqual(["San Juan de Lurigancho", "El Agustino"]);
  });
  it("refuses an empty zone, too many districts or one it does not know", () => {
    expect(agentUpdateSchema.safeParse({ districts: [] }).success).toBe(false);
    expect(agentUpdateSchema.safeParse({ districts: AGENT_DISTRICTS.slice(0, MAX_AGENT_DISTRICTS + 1) }).success).toBe(false);
    expect(agentUpdateSchema.safeParse({ districts: ["Narnia"] }).success).toBe(false);
  });
  it("lets the switch change alone", () => {
    expect(agentUpdateSchema.safeParse({ paused: true }).success).toBe(true);
  });
  it("offers every district the map search knows, plus SJL's neighbours, once each", () => {
    for (const d of DISTRICTS) expect(AGENT_DISTRICTS).toContain(d);
    expect(AGENT_DISTRICTS).toContain("El Agustino");
    expect(new Set(AGENT_DISTRICTS).size).toBe(AGENT_DISTRICTS.length);
  });
});
