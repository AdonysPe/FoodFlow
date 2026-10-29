// The WhatsApp messages Adonis sends from the FoodFlow WhatsApp, drafted from the
// facts Google publishes about each venue. Nothing here is invented: the only
// numbers quoted are the venue's own rating and review count, and the offer
// is the one on the site (48 hours, 7 días gratis, sin comisión). Every first
// message says how to make it stop.

import type { Segment } from "./searches";

/** Who signs. The messages go out from the FoodFlow WhatsApp, in the first person. */
export const SENDER = "Adonis";
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
  source: "google" | "osm";
  district: string;
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

/** The message for the next touch: 0 is the first, 1 and 2 the follow-ups. */
export function draftMessage(facts: DraftFacts, touches: number): string {
  if (touches <= 0) {
    return (
      `Hola, ¿qué tal? Soy ${SENDER}, de FoodFlow. ` +
      (facts.source === "google" ? `Vi ${facts.name} en Google Maps${ratingLine(facts)} ` : `Encontré ${facts.name} buscando restaurantes en ${facts.district} `) +
      `y te escribo porque hicimos un sistema para restaurantes de Lima: ${PITCH[facts.segment]}. ` +
      `Te lo dejamos funcionando en 48 horas, con 7 días gratis y sin comisión por pedido. ` +
      `¿Te muestro cómo se vería con tu carta? Si no te interesa, dímelo y no te vuelvo a escribir.`
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
    `los 7 días gratis siguen en pie: escríbeme por aquí cuando te venga bien. ¡Buen servicio!`
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
