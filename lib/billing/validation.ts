// Field-level rules for the facturación electrónica form.
//
// Every rule lives here once and is used twice: the form calls it on blur and
// on change to show the message inline, and the server action calls the same
// function before writing. A rule that only existed on the client would be a
// suggestion, not a validation.

export type FieldCheck = string | null; // null = valid, string = what is wrong

/**
 * RUC: 11 digits, a valid taxpayer-type prefix, and the módulo-11 check digit.
 *
 * The check digit matters here: a typo that keeps 11 digits sails past a
 * length check and then gets rejected by SUNAT on every single comprobante,
 * hours after the owner walked away from this screen.
 */
export function rucCheckDigit(ruc: string): number | null {
  if (!/^\d{11}$/.test(ruc)) return null;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(ruc[i]), 0);
  const rest = 11 - (sum % 11);
  return rest === 10 ? 0 : rest === 11 ? 1 : rest;
}

export function checkRuc(raw: string, { required = true } = {}): FieldCheck {
  const value = raw.replace(/\D/g, "");
  if (!value) return required ? "Ingresa tu RUC." : null;
  if (value.length !== 11) return "El RUC tiene 11 dígitos.";
  if (!/^(10|15|17|20)/.test(value)) {
    return "Un RUC peruano empieza en 10, 15, 17 o 20.";
  }
  if (rucCheckDigit(value) !== Number(value[10])) {
    return "Ese RUC no existe: el último dígito no cuadra. Revísalo.";
  }
  return null;
}

export function checkDni(raw: string, { required = false } = {}): FieldCheck {
  const value = raw.replace(/\D/g, "");
  if (!value) return required ? "Ingresa el DNI." : null;
  if (value.length !== 8) return "El DNI tiene 8 dígitos.";
  return null;
}

export function checkRequired(raw: string, label: string, min = 2): FieldCheck {
  const value = raw.trim();
  if (!value) return `${label} es obligatorio.`;
  if (value.length < min) return `${label} es muy corto.`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function checkEmail(raw: string, { required = false } = {}): FieldCheck {
  const value = raw.trim();
  if (!value) return required ? "Ingresa un correo." : null;
  if (!EMAIL_RE.test(value)) return "Ese correo no tiene un formato válido.";
  return null;
}

/**
 * Peruvian landline/mobile as the owner would print it on a ticket. Loose on
 * purpose — parentheses, spaces and dashes are all fine, digits are not.
 */
export function checkPhone(raw: string, { required = false } = {}): FieldCheck {
  const value = raw.trim();
  if (!value) return required ? "Ingresa un teléfono." : null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return "Faltan dígitos. Ej: (01) 555 1234 o 999 888 777.";
  if (digits.length > 15) return "Ese teléfono tiene demasiados dígitos.";
  return null;
}

/**
 * Series of an electronic comprobante.
 *
 * SUNAT does not take "three letters and three numbers": a boleta series is
 * the letter B and three more characters, a factura the letter F, and a nota
 * de crédito follows the letter of the document it corrects. That is why the
 * defaults are B001, F001 and FC01 rather than something like BOL001.
 */
export type SeriesKind = "boleta" | "factura" | "credit";

const SERIES_PREFIX: Record<SeriesKind, RegExp> = {
  boleta: /^B[A-Z0-9]{3}$/,
  factura: /^F[A-Z0-9]{3}$/,
  credit: /^[BF][A-Z0-9]{3}$/,
};

const SERIES_HELP: Record<SeriesKind, string> = {
  boleta: "La serie de una boleta empieza con B y tiene 4 caracteres. Ej: B001.",
  factura: "La serie de una factura empieza con F y tiene 4 caracteres. Ej: F001.",
  credit:
    "Una nota de crédito lleva la letra del documento que corrige: B o F, y 4 caracteres. Ej: FC01.",
};

export function checkSeries(raw: string, kind: SeriesKind): FieldCheck {
  const value = raw.trim().toUpperCase();
  if (!value) return "Ingresa la serie.";
  if (!SERIES_PREFIX[kind].test(value)) return SERIES_HELP[kind];
  return null;
}

export function checkCounter(raw: string | number): FieldCheck {
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return "El correlativo es un número entero.";
  }
  if (value < 1) return "El correlativo empieza en 1.";
  if (value > 99_999_999) return "Ese correlativo es demasiado grande.";
  return null;
}

export function checkApiKey(raw: string, { required = true } = {}): FieldCheck {
  const value = raw.trim();
  if (!value) return required ? "Pega la credencial que te dio tu OSE." : null;
  if (value.length < 10) return "Esa credencial es muy corta; revísala.";
  return null;
}

/** The OSE endpoint. https only — a token sent over http is a token leaked. */
export function checkEndpoint(raw: string, { required = true } = {}): FieldCheck {
  const value = raw.trim();
  if (!value) return required ? "Pega la URL que te dio tu OSE." : null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Esa no es una URL válida. Debe empezar con https://";
  }
  if (url.protocol !== "https:") return "La URL debe usar https.";
  return null;
}

/** `B001-00000001` — how every electronic comprobante is numbered. */
export function formatElectronicNo(series: string, counter: number): string {
  const prefix = (series || "").trim().toUpperCase();
  return `${prefix}-${String(Math.max(1, Math.trunc(counter))).padStart(8, "0")}`;
}
