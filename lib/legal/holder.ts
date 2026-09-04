/**
 * The one place the legal identity of the service is written down.
 *
 * Every legal surface — footer, terms, privacy policy, cookie policy and the
 * complaints book — reads from here, so a change of name, email or address is
 * a single edit and can never leave one document contradicting another.
 *
 * `taxId` is intentionally null: FoodFlow is run by a natural person and no
 * RUC or DNI has been chosen for publication. Fill it in and every document
 * that identifies the supplier picks it up. INDECOPI's complaints-book rules
 * expect the supplier to be identifiable, so this is worth revisiting.
 */
export const LEGAL_HOLDER = {
  name: "Adonys Pereda",
  role: "Desarrollador de Software",
  location: "Lima, Perú (Operación Remota)",
  email: "info@foodflow.site",
  brand: "FoodFlow",
  domain: "foodflow.site",
  taxId: null as string | null,
} as const;

/**
 * Shown as "Última actualización" on every legal page. Bump it whenever a
 * document changes in substance — the date is what tells a user (or an
 * INDECOPI inspector) which version they agreed to.
 */
export const LEGAL_UPDATED = "3 de septiembre de 2026";

/** Working days a claim or complaint takes to be answered. See ClaimsBook. */
export const CLAIM_RESPONSE_DAYS = 30;
