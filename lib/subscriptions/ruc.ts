// RUC validation (Perú): 11 digits, a known prefix, and SUNAT's modulo-11 check
// digit. Pure — safe to import from the client contract and the server alike.
//
// A wrong RUC on a factura is not a typo to fix later: the comprobante is
// issued to that taxpayer, so the check digit is verified before anything is
// stored, not only the length.

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

// 10 persona natural, 15/16/17 otros sujetos, 20 persona jurídica.
const PREFIXES = new Set(["10", "15", "16", "17", "20"]);

export function isValidRuc(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (!PREFIXES.has(value.slice(0, 2))) return false;
  let sum = 0;
  for (let i = 0; i < WEIGHTS.length; i++) sum += Number(value[i]) * WEIGHTS[i];
  // 11 - (sum mod 11), where a result of 10 becomes 0 and 11 becomes 1.
  const check = (11 - (sum % 11)) % 10;
  return check === Number(value[10]);
}

/**
 * FoodFlow's OWN RUC, the one that issues the receipts for these payments.
 * Read from the same public variable the site footer and the libro de
 * reclamaciones print, so there is one place to set it. Null until it is set
 * to a valid RUC.
 */
export function foodflowRuc(): string | null {
  const raw = process.env.NEXT_PUBLIC_LEGAL_TAX_ID?.replace(/\D/g, "") ?? "";
  return isValidRuc(raw) ? raw : null;
}
