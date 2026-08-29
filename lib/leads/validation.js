/**
 * Lead rules shared by the browser and the server action, so the inline
 * error a visitor sees and the check that guards the database are the same
 * code. Plain JS on purpose: imported from client components too.
 */

/** Peru mobile numbers: 9 digits, always starting with 9. */
export const WHATSAPP_LENGTH = 9;

/** Strips spaces, dashes, parentheses and a leading +51 / 51 country code. */
export function normalizeWhatsApp(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length > WHATSAPP_LENGTH && digits.startsWith("51")) {
    return digits.slice(2, 2 + WHATSAPP_LENGTH);
  }
  return digits.slice(0, WHATSAPP_LENGTH);
}

/** Pretty form while typing: 987 654 321. */
export function formatWhatsApp(raw) {
  const digits = normalizeWhatsApp(raw);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function isValidWhatsApp(raw) {
  const digits = normalizeWhatsApp(raw);
  return digits.length === WHATSAPP_LENGTH && digits.startsWith("9");
}

export function isValidEmail(raw) {
  const value = String(raw ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Field-by-field check. Returns an object of error *codes* — never text —
 * because the copy lives in the dictionary and has two languages.
 */
export function validateLead({ nombre, restaurante, whatsapp, email }) {
  const errors = {};

  if (String(nombre ?? "").trim().length < 2) errors.nombre = "required";
  if (String(restaurante ?? "").trim().length < 2) errors.restaurante = "required";

  const digits = normalizeWhatsApp(whatsapp);
  if (digits.length === 0) errors.whatsapp = "required";
  else if (!isValidWhatsApp(digits)) errors.whatsapp = "format";

  const mail = String(email ?? "").trim();
  if (mail && !isValidEmail(mail)) errors.email = "format";

  return errors;
}

/**
 * 0–100 from the yearly loss: S/ 30 000 a year already maxes the scale, and
 * a lead with no calculator figure scores 0 rather than guessing.
 */
export function leadScore(perdidaAnual) {
  if (!perdidaAnual || perdidaAnual <= 0) return 0;
  return Math.min(100, Math.floor(perdidaAnual / 300));
}
