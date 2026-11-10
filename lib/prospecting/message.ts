// The WhatsApp messages Adonis sends, drafted from the facts each source
// publishes about a venue. Nothing here is invented: the only numbers quoted
// are the venue's own rating and review count, and the offer is the founder
// one Adonis approved on 2026-11-05 (48 hours to set up, first month free, then
// half price for six months, five places, no commission). Every first message
// says how to make it stop — the agent's own openers included.

import type { Segment } from "./searches";

/** Who signs. The messages go out from the FoodFlow WhatsApp, in the first person. */
export const SENDER = "Adonis";
export const SITE = "https://foodflow.site";

/** The founder offer: how many restaurants get it, and for how long they pay half. */
export const FOUNDER_SPOTS = 5;
export const FOUNDER_HALF_PRICE_MONTHS = 6;
const OFFER = `el primer mes es gratis y los ${FOUNDER_HALF_PRICE_MONTHS} meses siguientes pagas la mitad, sin comisión por pedido`;
const OPT_OUT = "Si no te interesa, dímelo y no te vuelvo a escribir.";

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
  // OpenStreetMap says where it was found instead, and one from social media
  // names the network.
  source: "google" | "osm" | "redes";
  district: string;
  network?: "Instagram" | "Facebook" | null;
  // The first message the social-media agent wrote for this venue, used in
  // place of the template for touch 0.
  opener?: string | null;
};

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

function foundLine(facts: DraftFacts): string {
  if (facts.source === "google") return `Vi ${facts.name} en Google Maps${ratingLine(facts)} `;
  if (facts.source === "redes" && facts.network) return `Vi ${facts.name} en ${facts.network} `;
  return `Encontré ${facts.name} buscando restaurantes en ${facts.district} `;
}

/** The agent's opener, with the way out added when it forgot it. */
function withOptOut(text: string): string {
  const trimmed = text.trim();
  return /no te vuelvo a escribir/i.test(trimmed) ? trimmed : `${trimmed} ${OPT_OUT}`;
}

/** The message for the next touch: 0 is the first, 1 and 2 the follow-ups. */
export function draftMessage(facts: DraftFacts, touches: number): string {
  if (touches <= 0) {
    if (facts.opener?.trim()) return withOptOut(facts.opener);
    return (
      `Hola, ¿qué tal? Soy ${SENDER}, de FoodFlow. ` +
      foundLine(facts) +
      `y te escribo porque hicimos un sistema para restaurantes de Lima: ${PITCH[facts.segment]}. ` +
      `Estoy buscando ${FOUNDER_SPOTS} restaurantes fundadores: te lo dejamos funcionando en 48 horas, ${OFFER}. ` +
      `¿Te muestro cómo se vería con tu carta? ${OPT_OUT}`
    );
  }
  if (touches === 1) {
    return (
      `Hola de nuevo, soy ${SENDER} de FoodFlow. Te dejo la página para que veas cómo funciona: ${SITE} . ` +
      `Si te animas, armo la carta de ${facts.name} con tus platos reales y la ves antes de decidir nada.`
    );
  }
  return (
    `Último mensaje, prometido. Si en algún momento quieres probar FoodFlow en ${facts.name}, ` +
    `escríbeme mientras queden cupos de fundador: ${OFFER}. ¡Buen servicio!`
  );
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
