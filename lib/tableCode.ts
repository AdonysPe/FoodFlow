import { randomBytes } from "node:crypto";

/**
 * The code printed on a table's QR.
 *
 * Crockford base32 minus the ambiguous letters, so a code that has to be read
 * off a smudged sticker and typed by hand cannot turn a 0 into an O. Ten
 * characters over a 30-letter alphabet is ~49 bits: a table cannot be guessed,
 * and codes cannot be walked from one table to the next the way sequential ids
 * can.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LENGTH = 10;

export function generateTableCode(): string {
  const bytes = randomBytes(LENGTH);
  let out = "";
  for (let i = 0; i < LENGTH; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Normalises what a person typed: case and the separators they might add. */
export function normalizeTableCode(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

/** The URL the QR encodes. Absolute, because it is scanned off paper. */
export function tableOrderUrl(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/m/${code}`;
}
