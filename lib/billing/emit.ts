// The seam where a comprobante leaves FoodFlow for the venue's own OSE.
//
// STATE OF PLAY. Nubefact is wired (see ./adapters/nubefact.ts). Every other
// provider in the catalogue still resolves to no adapter, and a venue on one of
// those gets a failure that falls through to the internal nota de venta. That
// is deliberate: the alternative — stamping "aceptado" on a document SUNAT
// never received — is the one outcome that can actually fine a restaurant.
//
// Adding a provider is implementing `OseAdapter` and registering it in
// ADAPTERS below. Everything around it (credentials, correlatives, the states
// the till renders, the retry) is already here.

import { formatElectronicNo } from "@/lib/billing/validation";
import type { OseProvider } from "@/lib/billing/providers";
import { nubefactAdapter } from "@/lib/billing/adapters/nubefact";

export type EmissionLine = {
  description: string;
  quantity: number;
  /** Unit price with IGV included, the way a Peruvian menu prices things. */
  unitPrice: number;
};

export type EmissionRequest = {
  documentType: "boleta" | "factura";
  series: string;
  number: number;
  issuedAt: Date;
  issuer: {
    ruc: string;
    legalName: string;
    tradeName: string | null;
    address: string | null;
  };
  customer: {
    docType: "dni" | "ruc";
    docId: string;
    name: string | null;
    address: string | null;
    email: string | null;
  } | null;
  lines: EmissionLine[];
  total: number;
  igvRate: number;
  /** Whether the venue declares IGV at all (a Nuevo RUS venue does not). */
  taxed: boolean;
  credentials: {
    apiKey: string;
    apiSecret: string | null;
    endpoint: string | null;
    certificate: string | null;
    certificatePassword: string | null;
  };
};

export type EmissionSuccess = {
  ok: true;
  documentNo: string;
  /** Digest of the signed XML. Goes inside the QR square on the ticket. */
  hash: string | null;
  /** Where the customer can download the PDF, from the provider. */
  link: string | null;
  xmlLink: string | null;
  /**
   * The QR line as the OSE built it. Preferred over the one FoodFlow composes
   * in lib/billing/qr.ts when the provider hands one over: theirs is what they
   * actually signed.
   */
  qrPayload: string | null;
  /** SUNAT's own response code, kept for the CDR archive. */
  sunatCode: string | null;
  message: string;
};

export type EmissionFailureCode =
  | "not_configured"
  | "not_implemented"
  | "rejected"
  | "network";

export type EmissionFailure = {
  ok: false;
  code: EmissionFailureCode;
  /** Shown verbatim in the till's error state, so it has to be plain Spanish. */
  message: string;
};

export type EmissionResult = EmissionSuccess | EmissionFailure;

export interface OseAdapter {
  readonly provider: OseProvider;
  emit(request: EmissionRequest): Promise<EmissionResult>;
  /** Cheapest call that proves the credentials work. */
  test(credentials: EmissionRequest["credentials"]): Promise<EmissionResult>;
}

const ADAPTERS: Partial<Record<OseProvider, OseAdapter>> = {
  nubefact: nubefactAdapter,
};

export function adapterFor(provider: OseProvider | null): OseAdapter | null {
  return provider ? ADAPTERS[provider] ?? null : null;
}

export const NOT_IMPLEMENTED_MESSAGE =
  "FoodFlow todavía no habla con ese proveedor OSE. El cobro quedó registrado; entrega la nota de venta y emite el comprobante por el medio que usas hoy.";

/** Which providers can actually emit today. Read by the settings screen. */
export function implementedProviders(): OseProvider[] {
  return Object.keys(ADAPTERS) as OseProvider[];
}

export async function emitComprobante(
  provider: OseProvider | null,
  request: EmissionRequest
): Promise<EmissionResult> {
  const adapter = adapterFor(provider);
  if (!adapter) {
    return { ok: false, code: "not_implemented", message: NOT_IMPLEMENTED_MESSAGE };
  }
  try {
    return await adapter.emit(request);
  } catch (err) {
    return {
      ok: false,
      code: "network",
      message:
        err instanceof Error
          ? `No pudimos alcanzar a tu OSE: ${err.message}`
          : "No pudimos alcanzar a tu OSE.",
    };
  }
}

/** Only used to render the number the till is about to print. */
export function previewDocumentNo(series: string, number: number): string {
  return formatElectronicNo(series, number);
}
