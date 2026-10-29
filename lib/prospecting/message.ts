// The WhatsApp messages Adonis sends from the FoodFlow WhatsApp: the one the
// lead-finding agent wrote for a venue, or the panel's editable templates
// filled with the facts the map publishes. Nothing in the defaults is
// invented: the only numbers quoted are the venue's own rating and review
// count, and the offer is the one on the site (48 hours, 7 días gratis, sin
// comisión). Every default first message says how to make it stop.

import type { Segment } from "./searches";

export const SITE = "https://foodflow.site";

/** Messages in the sequence: the first one and two follow-ups. */
export const MAX_TOUCHES = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
// Days after the previous message before the next one is due: day 0, day 3,
// day 7. After the third, the prospect is left alone.
const GAP_DAYS = [3, 4];

export type DraftFacts = {
  name: string;
  segment: Segment;
  rating: number | null;
  reviewCount: number | null;
  // "Vi X en Google Maps" is only true of a Google row; one from
  // OpenStreetMap says where it was found instead.
  source: "google" | "osm" | "sheet";
  district: string;
  // What the lead-finding agent drafted for this venue (sheet rows only).
  customMessage?: string | null;
  customFollowUp?: string | null;
};

/**
 * Which first message to send: the one the agent wrote for this venue, or one
 * of the panel's two templates. Recorded on the prospect when it goes out, so
 * the panel can show which one gets more replies.
 */
export type Variant = "agente" | "A" | "B";

export type TemplateKey = "signature" | "first.A" | "first.B" | "follow.1" | "follow.2";
export type Templates = Record<TemplateKey, string>;

export const TEMPLATE_KEYS: TemplateKey[] = ["signature", "first.A", "first.B", "follow.1", "follow.2"];

/**
 * The defaults, used for any key with no row in `prospect_templates`.
 * Placeholders: {firma} {local} {distrito} {visto} {propuesta} {web}.
 * {visto} is the honest "where I found you" line: the Google Maps rating when
 * it flatters, or the district for a venue from OpenStreetMap.
 */
export const DEFAULT_TEMPLATES: Templates = {
  signature: "Adonis",
  "first.A":
    "Hola, ¿qué tal? Soy {firma}, de FoodFlow. {visto} y te escribo porque hicimos un sistema para restaurantes de Lima: {propuesta}. " +
    "Te lo dejamos funcionando en 48 horas, con 7 días gratis y sin comisión por pedido. " +
    "¿Te muestro cómo se vería con tu carta? Si no te interesa, dímelo y no te vuelvo a escribir.",
  "first.B":
    "Hola, buen día. Soy {firma}, de FoodFlow. Ayudamos a restaurantes de Lima con {propuesta}. " +
    "Lo dejamos listo en 48 horas, con 7 días gratis y sin comisión por pedido. " +
    "¿Te mando un ejemplo armado con la carta de {local}? Si prefieres que no te escriba, me dices y no te vuelvo a escribir.",
  "follow.1":
    "Hola de nuevo, soy {firma} de FoodFlow. Te dejo la página para que veas cómo funciona: {web} . " +
    "Si te animas, armo la carta de {local} con tus platos reales y la ves antes de decidir nada.",
  "follow.2":
    "Último mensaje, prometido. Si en algún momento quieres probar FoodFlow en {local}, " +
    "los 7 días gratis siguen en pie: escríbeme por aquí cuando te venga bien. ¡Buen servicio!",
};

/** The saved overrides on top of the defaults; blank means "use the default". */
export function withDefaults(saved: Partial<Record<string, string>>): Templates {
  const out = { ...DEFAULT_TEMPLATES };
  for (const key of TEMPLATE_KEYS) {
    const value = saved[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/** The variant a prospect starts on: the agent's own message when there is one. */
export function defaultVariant(facts: Pick<DraftFacts, "customMessage">): Variant {
  return facts.customMessage?.trim() ? "agente" : "A";
}

const PITCH: Record<Segment, string> = {
  mesas: "carta con QR en cada mesa, la comanda en el celular del mozo y los pedidos directo a cocina",
  cafe: "carta digital con QR y pedidos desde la mesa, sin papel ni esperas",
  delivery: "tu propia web de pedidos para delivery y recojo, sin pagarle comisión a las apps",
  menu: "la carta del día con QR, que cambias desde el celular en un minuto",
};

function ratingLine(facts: DraftFacts): string {
  if (facts.rating == null || facts.rating < 4.3 || (facts.reviewCount ?? 0) < 50) return "";
  const rating = facts.rating.toFixed(1).replace(".", ",");
  const reviews = facts.reviewCount!.toLocaleString("es-PE");
  return ` (${rating} con ${reviews} reseñas: se nota que la gente vuelve)`;
}

function render(template: string, facts: DraftFacts, templates: Templates): string {
  const seen =
    facts.source === "osm" ? `Encontré ${facts.name} buscando restaurantes en ${facts.district}` : `Vi ${facts.name} en Google Maps${ratingLine(facts)}`;
  const values: Record<string, string> = {
    firma: templates.signature,
    local: facts.name,
    distrito: facts.district,
    visto: seen,
    propuesta: PITCH[facts.segment],
    web: SITE,
  };
  // Unknown placeholders stay as typed, so a typo shows up in the preview.
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * The message for the next touch: 0 is the first, 1 and 2 the follow-ups.
 * The agent's own texts win when the variant is "agente" and it wrote one;
 * everything else comes from the templates.
 */
export function draftMessage(facts: DraftFacts, touches: number, variant: Variant = defaultVariant(facts), templates: Templates = DEFAULT_TEMPLATES): string {
  if (touches <= 0) {
    if (variant === "agente" && facts.customMessage?.trim()) return facts.customMessage.trim();
    return render(templates[variant === "B" ? "first.B" : "first.A"], facts, templates);
  }
  if (touches === 1) {
    if (variant === "agente" && facts.customFollowUp?.trim()) return facts.customFollowUp.trim();
    return render(templates["follow.1"], facts, templates);
  }
  return render(templates["follow.2"], facts, templates);
}

/** wa.me link that opens the chat with the draft already typed. */
export function whatsappLink(mobile: string, text: string): string {
  return `https://wa.me/51${mobile}?text=${encodeURIComponent(text)}`;
}

/**
 * When the next follow-up is due, or null when none is: nothing sent yet (the
 * first message is the "nuevos" list's job) or the sequence is over.
 */
export function nextFollowUpAt(touches: number, lastTouchAt: Date | null): Date | null {
  if (touches < 1 || touches >= MAX_TOUCHES || !lastTouchAt) return null;
  return new Date(lastTouchAt.getTime() + GAP_DAYS[touches - 1] * DAY_MS);
}
