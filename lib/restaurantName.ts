import { z } from "zod";

export const RESTAURANT_NAME_MIN = 2;
export const RESTAURANT_NAME_MAX = 80;

/**
 * What a restaurant name may look like once it reaches the database.
 *
 * Shared by the settings form (so the button knows when it can enable itself)
 * and by the server action (which is the one that actually decides). Control
 * and zero-width characters are dropped — they are invisible, so two names that
 * look identical could differ — and runs of whitespace collapse to one space,
 * which also removes any line break pasted from a document.
 */
export function normalizeRestaurantName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const restaurantNameSchema = z
  .string({ message: "Escribe el nombre de tu restaurante." })
  .transform(normalizeRestaurantName)
  .pipe(
    z
      .string()
      .min(RESTAURANT_NAME_MIN, `El nombre debe tener al menos ${RESTAURANT_NAME_MIN} caracteres.`)
      .max(RESTAURANT_NAME_MAX, `El nombre puede tener hasta ${RESTAURANT_NAME_MAX} caracteres.`)
  );
