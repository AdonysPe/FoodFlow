// The lead-finding agent's Google Sheet as a prospect source. The agent keeps
// writing to the sheet; the panel reads it, read-only, every morning (and on
// "Importar hoja ahora"), and works the leads from there. Status lives in the
// panel only — nothing is ever written back.
//
// Access is a Google service account with the Sheets read-only scope, shared
// on the sheet as a viewer:
//   GOOGLE_SHEETS_SERVICE_ACCOUNT  the account's JSON key, pasted whole
//   PROSPECTS_SHEET_ID             the id in the sheet's URL
//   PROSPECTS_SHEET_TAB            the tab to read (default "Restaurantes")
//
// Columns are found by their header text, not their position, so the agent
// can add or move columns without breaking the import.
//
// Server only.

import { SignJWT, importPKCS8 } from "jose";
import type { Place } from "./places";
import type { Segment } from "./searches";
import { peruMobile } from "./score";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export class SheetError extends Error {}

type ServiceAccount = { client_email: string; private_key: string };

export type SheetConfig = { account: ServiceAccount; sheetId: string; tab: string };

export function sheetConfig(): SheetConfig | null {
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT?.trim();
  const sheetId = process.env.PROSPECTS_SHEET_ID?.trim();
  if (!raw || !sheetId) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      // Pasted through a dashboard, the key's newlines often arrive escaped.
      account: { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") },
      sheetId,
      tab: process.env.PROSPECTS_SHEET_TAB?.trim() || "Restaurantes",
    };
  } catch {
    return null;
  }
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const key = await importPKCS8(account.private_key, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !data?.access_token) throw new SheetError(`Google no aceptó la cuenta de servicio (${data?.error_description ?? response.status}).`);
  return data.access_token;
}

/** Every cell of the tab, as the sheet shows it. */
export async function fetchSheetValues(config: SheetConfig): Promise<string[][]> {
  const token = await accessToken(config.account);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(config.tab)}?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const hint = response.status === 403 || response.status === 404 ? " ¿Compartiste la hoja con la cuenta de servicio?" : "";
    throw new SheetError(`No se pudo leer la hoja (${body?.error?.message ?? response.status}).${hint}`);
  }
  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}

// ------------------------------------------------------------ the mapping

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Header text (folded) → field. A header matches when it starts with the key,
// so "Seguimiento (a los 2-3 días)" is found as "seguimiento".
const COLUMNS = {
  priority: "prioridad",
  name: "nombre",
  kind: "tipo de negocio",
  chain: "independiente / cadena",
  district: "distrito",
  address: "direccion",
  phone: "telefono",
  whatsapp: "whatsapp",
  facebook: "facebook",
  instagram: "instagram",
  otherLink: "otra red",
  lacks: "que le falta",
  signals: "problemas",
  opportunities: "oportunidades",
  rating: "rating",
  reviews: "resenas",
  unclaimed: "perfil google sin reclamar",
  maps: "google maps",
  status: "estado contacto",
  ownNotes: "notas propias",
  message: "mensaje whatsapp",
  followUp: "seguimiento",
} as const;

type Field = keyof typeof COLUMNS;

export type SheetLead = {
  place: Place;
  segment: Segment;
  district: string;
  notes: string | null;
  customMessage: string | null;
  customFollowUp: string | null;
  // What "Estado contacto" already says, for a row the panel has never seen.
  initialStatus: "nuevo" | "contactado" | "respondio" | "cliente" | "descartado";
  // The agent's "Prioridad" nudges the panel's score: Alta +10, Baja −10.
  scoreBoost: number;
};

function columnIndex(header: string[]): Partial<Record<Field, number>> {
  const folded = header.map((h) => fold(String(h ?? "")));
  const out: Partial<Record<Field, number>> = {};
  for (const [field, key] of Object.entries(COLUMNS) as [Field, string][]) {
    // Exact first ("Teléfono" vs "Tipo teléfono"), then prefix.
    let i = folded.indexOf(key);
    if (i < 0) i = folded.findIndex((h) => h.startsWith(key));
    if (i >= 0) out[field] = i;
  }
  return out;
}

export function sheetSegment(kind: string): Segment {
  const k = fold(kind);
  if (/poll|broaster|chicken/.test(k)) return "delivery";
  if (/(^|[^a-z])menu([^a-z]|$)/.test(k)) return "menu";
  if (/cafe|cafeter|brunch|panader|pasteler|heladeria/.test(k)) return "cafe";
  return "mesas";
}

/** The Google place id inside a Maps link, when the agent saved one. */
export function placeIdFromMapsUrl(url: string): string | null {
  const match = /place_id:([A-Za-z0-9_-]{20,})/.exec(url) ?? /[?&]query_place_id=([A-Za-z0-9_-]{20,})/.exec(url);
  return match ? match[1] : null;
}

function statusFrom(text: string): SheetLead["initialStatus"] {
  const t = fold(text);
  if (!t) return "nuevo";
  // The no's first: "no le interesa" also contains "interes".
  if (/descart|no (le |les )?interes|no contactar|no escribir|rechaz/.test(t)) return "descartado";
  if (/client|cerrad|vendid/.test(t)) return "cliente";
  if (/respond|interes/.test(t)) return "respondio";
  return "contactado";
}

function asNumber(value: string): number | null {
  const n = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asUrl(value: string, base?: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (base && v.startsWith("@")) return `${base}${v.slice(1)}`;
  return /\./.test(v) ? `https://${v}` : null;
}

/** Turns the tab into leads. Rows without a name or a district are skipped. */
export function parseSheet(values: string[][]): SheetLead[] {
  if (values.length < 2) return [];
  const idx = columnIndex(values[0]);
  if (idx.name == null || idx.district == null) throw new SheetError("La hoja no tiene las columnas \"Nombre\" y \"Distrito\".");

  const leads: SheetLead[] = [];
  for (const row of values.slice(1)) {
    const cell = (field: Field) => (idx[field] == null ? "" : String(row[idx[field]!] ?? "").trim());
    const name = cell("name");
    const district = cell("district");
    if (!name || !district) continue;

    const kind = cell("kind");
    const mapsUrl = cell("maps");
    const whatsappDigits = peruMobile(cell("whatsapp").replace(/^.*wa\.me\//, ""));
    const phone = whatsappDigits ? `+51 ${whatsappDigits.slice(0, 3)} ${whatsappDigits.slice(3, 6)} ${whatsappDigits.slice(6)}` : cell("phone") || null;
    const priority = fold(cell("priority"));

    const notes = [
      cell("priority") && `Prioridad: ${cell("priority")}`,
      kind && `Tipo: ${kind}`,
      cell("chain") && `Independiente / cadena: ${cell("chain")}`,
      cell("lacks") && `Qué le falta: ${cell("lacks")}`,
      cell("signals") && `Señales: ${cell("signals")}`,
      cell("opportunities") && `Oportunidades: ${cell("opportunities")}`,
      /^s[ií]/i.test(cell("unclaimed")) && "Ficha de Google sin reclamar",
      cell("ownNotes") && `Notas: ${cell("ownNotes")}`,
    ].filter(Boolean);

    leads.push({
      place: {
        // The Google id when there is one, so the same venue found later by
        // Google Places lands on this row; otherwise a stable name key.
        id: placeIdFromMapsUrl(mapsUrl) ?? `sheet:${fold(name)}|${fold(district)}`,
        name,
        address: cell("address") || null,
        phone,
        website: asUrl(cell("instagram"), "https://instagram.com/") ?? asUrl(cell("facebook")) ?? asUrl(cell("otherLink")),
        mapsUrl: mapsUrl || null,
        category: kind.split("·")[0].trim() || null,
        rating: asNumber(cell("rating")),
        reviewCount: asNumber(cell("reviews")) == null ? null : Math.round(asNumber(cell("reviews"))!),
        open: true,
        delivery: null,
        dineIn: null,
        chain: /corporativ/.test(fold(cell("chain"))),
      },
      segment: sheetSegment(kind),
      district,
      notes: notes.length ? notes.join("\n") : null,
      customMessage: cell("message") || null,
      customFollowUp: cell("followUp") || null,
      initialStatus: statusFrom(cell("status")),
      scoreBoost: priority.startsWith("alta") ? 10 : priority.startsWith("baja") ? -10 : 0,
    });
  }
  return leads;
}
