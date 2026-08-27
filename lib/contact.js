/**
 * Single place for the contact details the site hands out.
 *
 * WHATSAPP_NUMBER is in international format, digits only (Peru is 51), e.g.
 * "51987654321". While it is empty the chat simply hides the WhatsApp button
 * and offers the email hand-off instead — no broken wa.me links.
 */
export const WHATSAPP_NUMBER = "51950360685";
export const CONTACT_EMAIL = "adonispereda1@gmail.com";

export function buildWhatsAppUrl(message) {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
