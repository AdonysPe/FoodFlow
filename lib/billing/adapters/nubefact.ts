// Adaptador de Nubefact: el primer OSE con el que FoodFlow sabe hablar.
//
// CÓMO FUNCIONA NUBEFACT. Cada contribuyente recibe una URL propia
// (https://api.nubefact.com/api/v1/<hash>) y un token. Todo va por POST a esa
// URL con `Authorization: Token token="<token>"`; la operación se elige con el
// campo `operacion` del cuerpo. No hay endpoints distintos por documento.
//
// LO QUE NO HACE ESTE ARCHIVO. No firma nada. Nubefact firma con el certificado
// que el propio local subió a SU cuenta de Nubefact, no con el .pfx que
// guardamos aquí — ese lo conservamos porque otros OSE sí exigen que el emisor
// firme, y porque el dueño necesita un sitio donde tenerlo. Si algún día se
// firma en casa, el punto de entrada es este mismo `emit`.
//
// ESTADO. Escrito contra la API pública documentada de Nubefact. Antes de la
// primera emisión real hay que pasarlo por una cuenta demo: los nombres de
// campo están verificados contra su documentación, pero un OSE cambia detalles
// sin avisar y aquí un detalle cuesta un comprobante rechazado. Mientras no se
// valide, `emit` sigue devolviendo el fallo hacia arriba y la caja entrega la
// nota de venta interna — nunca se estampa "aceptado" sin respuesta del OSE.

import { breakdownLine, reconcile, round2 } from "@/lib/billing/igv";
import { assertPublicHttpsUrl, guardedDispatcher } from "@/lib/billing/http";
import type {
  EmissionRequest,
  EmissionResult,
  OseAdapter,
} from "@/lib/billing/emit";

const TIMEOUT_MS = 20_000;

/** Catálogo de Nubefact, que no es el de SUNAT: 1 factura, 2 boleta, 3 NC. */
const DOC_KIND: Record<"boleta" | "factura", number> = { factura: 1, boleta: 2 };

/** Catálogo 06 de SUNAT: 1 DNI, 6 RUC, 0 sin documento. */
const CUSTOMER_DOC: Record<"dni" | "ruc", number> = { dni: 1, ruc: 6 };

type NubefactResponse = {
  tipo_de_comprobante?: number;
  serie?: string;
  numero?: number;
  enlace?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  /** Nubefact devuelve los errores de validación aquí, con HTTP 400. */
  errors?: string | string[];
};

/** "dd-mm-yyyy", que es el único formato de fecha que Nubefact acepta. */
function peruDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

function buildPayload(request: EmissionRequest) {
  const taxed = request.taxed;
  const rate = request.igvRate;

  const lines = request.lines.map((l) => breakdownLine(l, { rate, taxed }));
  const totals = taxed
    ? reconcile(lines, request.total)
    : {
        gravada: 0,
        igv: 0,
        exonerada: 0,
        inafecta: round2(request.total),
        total: round2(request.total),
      };

  const customer = request.customer;

  return {
    operacion: "generar_comprobante",
    tipo_de_comprobante: DOC_KIND[request.documentType],
    serie: request.series.toUpperCase(),
    numero: request.number,
    // Catálogo 17: 1 = venta interna. Un restaurante no emite otra cosa.
    sunat_transaction: 1,

    cliente_tipo_de_documento: customer ? CUSTOMER_DOC[customer.docType] : 0,
    // Sin documento, la boleta va a "CLIENTES VARIOS", que es lo que SUNAT
    // espera de una venta al público por debajo del umbral.
    cliente_numero_de_documento: customer?.docId ?? "",
    cliente_denominacion: customer?.name?.trim() || "CLIENTES VARIOS",
    cliente_direccion: customer?.address ?? "",
    cliente_email: customer?.email ?? "",

    fecha_de_emision: peruDate(request.issuedAt),
    // Catálogo 02: 1 = soles.
    moneda: 1,
    porcentaje_de_igv: taxed ? round2(rate * 100) : 0,

    total_gravada: totals.gravada,
    total_inafecta: totals.inafecta,
    total_exonerada: totals.exonerada,
    total_igv: totals.igv,
    total: totals.total,

    // Nubefact envía a SUNAT en la misma llamada. Lo contrario dejaría el
    // comprobante en su cola sin que nadie aquí sepa cuándo se envió.
    enviar_automaticamente_a_la_sunat: true,
    // El correo lo manda FoodFlow, con su propia plantilla y su registro en
    // `cdrs.emailed_at`. Delegarlo al OSE nos dejaría sin saber si salió.
    enviar_automaticamente_al_cliente: false,
    formato_de_pdf: "TICKET",

    items: lines.map((l, i) => ({
      // NIU = unidad. Un plato no se vende por kilo.
      unidad_de_medida: "NIU",
      codigo: String(i + 1),
      descripcion: l.description.slice(0, 250),
      cantidad: l.quantity,
      valor_unitario: l.unitValue,
      precio_unitario: l.unitPriceWithIgv,
      subtotal: l.subtotal,
      // Catálogo 07: 1 = gravado onerosa, 8 = inafecto onerosa.
      tipo_de_igv: taxed ? 1 : 8,
      igv: l.igv,
      total: l.total,
      anticipo_regularizacion: false,
    })),
  };
}

async function call(
  endpoint: string,
  token: string,
  body: unknown
): Promise<{ status: number; data: NubefactResponse } | { status: null; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        // Las comillas dobles son parte del formato de Nubefact, no un descuido.
        Authorization: `Token token="${token}"`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "user-agent": "FoodFlow/1.0 (+https://foodflow.site)",
      },
      body: JSON.stringify(body),
      redirect: "manual",
      // Re-checks the private-address guard at the exact moment this socket
      // opens, not only when assertPublicHttpsUrl ran earlier — see
      // lib/billing/http.ts's guardedDispatcher for why that gap mattered:
      // this is the call that carries the tenant's real OSE credentials.
      // @ts-expect-error -- undici's fetch extension, not in lib.dom types.
      dispatcher: guardedDispatcher,
    });
    const text = await res.text();
    let data: NubefactResponse = {};
    try {
      data = text ? (JSON.parse(text) as NubefactResponse) : {};
    } catch {
      return {
        status: null,
        error: `Tu OSE respondió algo que no es JSON (HTTP ${res.status}).`,
      };
    }
    return { status: res.status, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      status: null,
      error: aborted
        ? "Tu OSE no respondió en 20 segundos."
        : "No pudimos conectarnos con tu OSE.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function errorText(data: NubefactResponse): string | null {
  if (!data.errors) return null;
  return Array.isArray(data.errors) ? data.errors.join(" ") : String(data.errors);
}

/**
 * Traduce la respuesta de Nubefact a los tres desenlaces que el resto del
 * sistema entiende: aceptado, rechazado (definitivo) o error de red (se
 * reintenta). La frase que sale de aquí es la que lee el mozo en la caja.
 */
export function parseNubefactResponse(
  status: number | null,
  data: NubefactResponse,
  fallbackDocumentNo: string
): EmissionResult {
  const errors = errorText(data);

  if (status === 401 || status === 403) {
    return {
      ok: false,
      code: "rejected",
      message:
        "Tu OSE rechazó la credencial. Revisa el token en Configuración › Facturación.",
    };
  }

  // Un 5xx es del servidor del OSE, no del documento: se reintenta.
  if (status != null && status >= 500) {
    return {
      ok: false,
      code: "network",
      message: `Tu OSE tuvo un error interno (HTTP ${status}). Lo reintentamos en unos minutos.`,
    };
  }

  if (errors) {
    return {
      ok: false,
      code: "rejected",
      message: `Tu OSE no aceptó el comprobante: ${errors}`,
    };
  }

  if (data.sunat_soap_error) {
    return {
      ok: false,
      code: "network",
      message: `SUNAT no respondió al envío: ${data.sunat_soap_error}. Lo reintentamos.`,
    };
  }

  if (data.aceptada_por_sunat === true) {
    const documentNo =
      data.serie && data.numero != null
        ? `${data.serie}-${String(data.numero).padStart(8, "0")}`
        : fallbackDocumentNo;
    return {
      ok: true,
      documentNo,
      hash: data.codigo_hash ?? null,
      link: data.enlace_del_pdf ?? data.enlace ?? null,
      xmlLink: data.enlace_del_xml ?? null,
      qrPayload: data.cadena_para_codigo_qr ?? null,
      sunatCode: data.sunat_responsecode ?? null,
      message: data.sunat_description || "SUNAT aceptó el comprobante.",
    };
  }

  // Aceptada_por_sunat en false CON descripción es un rechazo de SUNAT: el
  // documento está muerto y el correlativo, gastado. No se reintenta.
  if (data.aceptada_por_sunat === false && (data.sunat_description || data.sunat_note)) {
    return {
      ok: false,
      code: "rejected",
      message: `SUNAT rechazó el comprobante: ${data.sunat_description || data.sunat_note}`,
    };
  }

  // Ni aceptado ni rechazado: quedó en cola del OSE. Se consulta luego.
  return {
    ok: false,
    code: "network",
    message:
      "Tu OSE recibió el comprobante pero SUNAT todavía no responde. Volvemos a consultarlo en unos minutos.",
  };
}

export const nubefactAdapter: OseAdapter = {
  provider: "nubefact",

  async emit(request) {
    const endpoint = request.credentials.endpoint?.trim();
    if (!endpoint) {
      return {
        ok: false,
        code: "not_configured",
        message: "Falta la URL de tu cuenta de Nubefact en Configuración › Facturación.",
      };
    }
    // La URL la escribió el dueño en un formulario: se valida antes de abrir el
    // socket, o el servidor termina hablándole a su propia red interna.
    const safe = await assertPublicHttpsUrl(endpoint);
    if (!safe.ok) return { ok: false, code: "not_configured", message: safe.message };

    const documentNo = `${request.series.toUpperCase()}-${String(request.number).padStart(8, "0")}`;
    const res = await call(endpoint, request.credentials.apiKey, buildPayload(request));
    if (res.status === null) {
      return { ok: false, code: "network", message: res.error };
    }
    return parseNubefactResponse(res.status, res.data, documentNo);
  },

  /**
   * La consulta más barata que prueba la credencial sin emitir nada.
   *
   * `consultar_comprobante` sobre un documento que no existe: si el token está
   * mal, Nubefact contesta 401; si está bien, contesta "no existe", que es
   * exactamente la prueba que buscamos.
   */
  async test(credentials) {
    const endpoint = credentials.endpoint?.trim();
    if (!endpoint) {
      return {
        ok: false,
        code: "not_configured",
        message: "Falta la URL de tu cuenta de Nubefact.",
      };
    }
    const safe = await assertPublicHttpsUrl(endpoint);
    if (!safe.ok) return { ok: false, code: "not_configured", message: safe.message };

    const res = await call(endpoint, credentials.apiKey, {
      operacion: "consultar_comprobante",
      tipo_de_comprobante: 2,
      serie: "B001",
      numero: 0,
    });
    if (res.status === null) return { ok: false, code: "network", message: res.error };

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "rejected",
        message: "Nubefact no reconoce ese token. Cópialo de nuevo desde tu panel.",
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        code: "network",
        message: `Nubefact respondió con un error interno (HTTP ${res.status}). Inténtalo más tarde.`,
      };
    }
    // Cualquier otra cosa — incluido "el comprobante no existe" — significa que
    // el token entró y la cuenta responde.
    return {
      ok: true,
      documentNo: "",
      hash: null,
      link: null,
      xmlLink: null,
      qrPayload: null,
      sunatCode: null,
      message: "Nubefact aceptó tu token. La cuenta está lista para emitir.",
    };
  },
};
