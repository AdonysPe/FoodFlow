/** Single source of truth for every public legal surface. */
export const LEGAL_HOLDER = {
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || "Adonys Pereda",
  taxAddress:
    process.env.NEXT_PUBLIC_LEGAL_TAX_ADDRESS?.trim() || "Lima, Lima, Perú",
  legalEmail:
    process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || "legal@foodflow.site",
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE?.trim() || "+51 950 360 685",
  taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID?.trim() || null,
  role: "Desarrollador de Software",
  brand: "FoodFlow",
  domain: "foodflow.site",

  // Compatibility aliases used by the legal document builders.
  get name() {
    return this.legalName;
  },
  get location() {
    return this.taxAddress;
  },
  get email() {
    return this.legalEmail;
  },
} as const;

/**
 * Shown as "Última actualización" on every legal page. Bump it whenever a
 * document changes in substance — the date is what tells a user (or an
 * INDECOPI inspector) which version they agreed to.
 */
export const LEGAL_UPDATED = "10 de septiembre de 2026";

/** Working days a claim or complaint takes to be answered. See ClaimsBook. */
export const CLAIM_RESPONSE_DAYS = 30;
