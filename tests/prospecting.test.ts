import { describe, expect, it } from "vitest";
import { hasOwnWebsite, isChain, peruMobile, prospectScore, suggestedPlan, type PlaceFacts } from "@/lib/prospecting/score";
import { DEFAULT_TEMPLATES, MAX_TOUCHES, defaultVariant, draftMessage, nextFollowUpAt, whatsappLink, withDefaults } from "@/lib/prospecting/message";
import { parseSheet, sheetSegment } from "@/lib/prospecting/sheet";
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
    expect(first).toContain("7 días gratis");
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

describe("the agent's sheet", () => {
  const header = ["#", "Prioridad", "Nombre", "Tipo de negocio", "Independiente / Cadena", "Distrito", "Dirección", "Teléfono", "Tipo teléfono", "WhatsApp", "Facebook", "Instagram", "Otra red / link", "Qué le falta", "Problemas / señales", "Oportunidades", "Rating", "Reseñas", "Perfil Google sin reclamar", "Google Maps", "Estado contacto", "Notas propias", "Mensaje WhatsApp / DM", "Abrir WhatsApp con mensaje", "Seguimiento (a los 2-3 días)"];
  const row = (over: Record<string, string> = {}) => {
    const base: Record<string, string> = {
      Prioridad: "Alta",
      Nombre: "Ejemplo Bar",
      "Tipo de negocio": "Bar-restaurante · alto tráfico (480 reseñas, 4.6★)",
      "Independiente / Cadena": "Independiente (1 local)",
      Distrito: "Miraflores",
      "Teléfono": "(01) 4447777",
      WhatsApp: "https://wa.me/51924000000",
      Instagram: "@ejemplobar",
      "Qué le falta": "Carta digital / QR",
      Rating: "4,6",
      "Reseñas": "480",
      "Perfil Google sin reclamar": "Sí",
      "Google Maps": "https://www.google.com/maps/place/?q=place_id:ChIJQXdGtC_JBZERwUL8ZYhEli0",
      "Mensaje WhatsApp / DM": "Hola, mensaje del agente",
      "Seguimiento (a los 2-3 días)": "Hola de nuevo, seguimiento del agente",
    };
    const values = { ...base, ...over };
    return header.map((h) => values[h] ?? "");
  };

  it("finds columns by their header and keeps the Google place id", () => {
    const [lead] = parseSheet([header, row()]);
    expect(lead.place.id).toBe("ChIJQXdGtC_JBZERwUL8ZYhEli0");
    expect(lead.place.phone).toBe("+51 924 000 000");
    expect(lead.place.rating).toBe(4.6);
    expect(lead.place.reviewCount).toBe(480);
    expect(lead.place.website).toBe("https://instagram.com/ejemplobar");
    expect(lead.customMessage).toBe("Hola, mensaje del agente");
    expect(lead.customFollowUp).toBe("Hola de nuevo, seguimiento del agente");
    expect(lead.notes).toContain("Ficha de Google sin reclamar");
    expect(lead.scoreBoost).toBe(10);
    expect(lead.initialStatus).toBe("nuevo");
  });

  it("works with columns in another order and skips rows without a name", () => {
    const shuffled = [...header].reverse();
    const values = row();
    const reordered = shuffled.map((h) => values[header.indexOf(h)]);
    const leads = parseSheet([shuffled, reordered, shuffled.map(() => "")]);
    expect(leads).toHaveLength(1);
    expect(leads[0].place.name).toBe("Ejemplo Bar");
  });

  it("keeps the stage the agent already reached", () => {
    expect(parseSheet([header, row({ "Estado contacto": "Enviado 20/10" })])[0].initialStatus).toBe("contactado");
    expect(parseSheet([header, row({ "Estado contacto": "No le interesa" })])[0].initialStatus).toBe("descartado");
    expect(parseSheet([header, row({ "Estado contacto": "Respondió, quiere demo" })])[0].initialStatus).toBe("respondio");
  });

  it("marks corporate chains and reads the kind of venue", () => {
    expect(parseSheet([header, row({ "Independiente / Cadena": "Cadena corporativa" })])[0].place.chain).toBe(true);
    expect(sheetSegment("Pollería · tráfico medio")).toBe("delivery");
    expect(sheetSegment("Cafetería")).toBe("cafe");
    expect(sheetSegment("Bar-restaurante")).toBe("mesas");
  });

  it("refuses a tab without Nombre and Distrito", () => {
    expect(() => parseSheet([["a", "b"], ["1", "2"]])).toThrow();
  });
});

describe("message templates", () => {
  const facts = { name: "Ejemplo", segment: "mesas" as const, rating: 4.6, reviewCount: 320, source: "sheet" as const, district: "Barranco", customMessage: "Del agente", customFollowUp: "Seguimiento del agente" };

  it("uses the agent's texts by default, and the templates on request", () => {
    expect(defaultVariant(facts)).toBe("agente");
    expect(draftMessage(facts, 0)).toBe("Del agente");
    expect(draftMessage(facts, 1)).toBe("Seguimiento del agente");
    expect(draftMessage(facts, 0, "B")).toContain("Ejemplo");
    expect(draftMessage(facts, 0, "B")).not.toBe(draftMessage(facts, 0, "A"));
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    const templates = withDefaults({ signature: "Adonys", "first.A": "Soy {firma} y vi {local} en {distrito}. {typo}" });
    expect(draftMessage({ ...facts, customMessage: null }, 0, "A", templates)).toBe("Soy Adonys y vi Ejemplo en Barranco. {typo}");
  });

  it("falls back to the default for a blank saved template", () => {
    expect(withDefaults({ "first.A": "   " })["first.A"]).toBe(DEFAULT_TEMPLATES["first.A"]);
  });
});
