// oseService: la única puerta hacia el operador de servicios electrónicos.
//
// Encima de `emit.ts` (que define el contrato del adaptador) y debajo de
// `emission.ts` (que orquesta correlativos, CDR y pedido). Lo que aporta esta
// capa es resolver la configuración del restaurante — proveedor, endpoint,
// credenciales descifradas — y decidir qué desenlace tuvo la llamada.
//
// TRES DESENLACES, NO DOS. La diferencia entre "SUNAT lo rechazó" y "no
// llegamos al OSE" es la que decide si el correlativo está quemado o si vale la
// pena reintentar. Confundirlas cuesta un comprobante o una tormenta de
// reintentos sobre un documento muerto.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import { tryDecryptSecret } from "@/lib/billing/crypto";
import { OSE_PROVIDER_META, isOseProvider, type OseProvider } from "@/lib/billing/providers";
import { probeEndpoint } from "@/lib/billing/http";
import {
  adapterFor,
  emitComprobante,
  NOT_IMPLEMENTED_MESSAGE,
  type EmissionRequest,
  type EmissionResult,
} from "@/lib/billing/emit";

export type ResolvedIssuer = {
  provider: OseProvider;
  ruc: string;
  legalName: string;
  tradeName: string | null;
  address: string | null;
  email: string | null;
  igvRate: number;
  taxed: boolean;
  credentials: EmissionRequest["credentials"];
};

export type ResolveOutcome =
  | { ok: true; issuer: ResolvedIssuer }
  | { ok: false; message: string };

/**
 * Junta, en una sola lectura, todo lo que hace falta para emitir.
 *
 * Es el único sitio donde se descifran las credenciales de un local. Lo que
 * devuelve vive en memoria durante una petición y nunca se registra: ni un
 * console.log de este objeto, ni una traza que lo lleve dentro.
 */
export async function resolveIssuer(restaurantId: string): Promise<ResolveOutcome> {
  const [row, creds] = await Promise.all([
    prisma.receiptSettings.findUnique({
      where: { restaurantId },
      select: {
        ruc: true,
        legalName: true,
        tradeName: true,
        address: true,
        sunatEmail: true,
        showIgv: true,
        igvRate: true,
        oseProvider: true,
        oseEndpoint: true,
      },
    }),
    prisma.billingCredentials.findUnique({ where: { restaurantId } }),
  ]);

  const provider = isOseProvider(row?.oseProvider) ? row.oseProvider : null;
  if (!provider) {
    return { ok: false, message: "Falta elegir tu proveedor OSE en Configuración › Facturación." };
  }
  if (!row?.ruc || !row.legalName) {
    return { ok: false, message: "Falta tu RUC o tu razón social en Configuración › Facturación." };
  }

  const apiKey = tryDecryptSecret(creds?.oseApiKeyEnc ?? null);
  if (!apiKey) {
    return {
      ok: false,
      message:
        "No pudimos leer la credencial de tu OSE. Vuelve a pegarla en Configuración › Facturación.",
    };
  }

  const meta = OSE_PROVIDER_META[provider];
  const apiSecret = tryDecryptSecret(creds?.oseApiSecretEnc ?? null);
  if (meta.needsSecret && !apiSecret) {
    return { ok: false, message: `${meta.label} necesita también el API Secret.` };
  }

  return {
    ok: true,
    issuer: {
      provider,
      ruc: row.ruc,
      legalName: row.legalName,
      tradeName: row.tradeName,
      address: row.address,
      email: row.sunatEmail,
      igvRate: row.igvRate,
      taxed: row.showIgv,
      credentials: {
        apiKey,
        apiSecret,
        endpoint: row.oseEndpoint,
        certificate: tryDecryptSecret(creds?.certDataEnc ?? null),
        certificatePassword: tryDecryptSecret(creds?.certPasswordEnc ?? null),
      },
    },
  };
}

export type ConnectionTest = {
  passed: boolean;
  message: string;
  /** false cuando lo único que se pudo probar fue que la URL existe. */
  credentialVerified: boolean;
};

/**
 * "Probar conexión".
 *
 * Con adaptador, prueba de verdad: le pregunta al OSE por un comprobante
 * inexistente y mira si acepta el token. Sin adaptador, solo puede comprobar
 * que la URL es un host público que responde — y lo dice con esas palabras, en
 * vez de pintar un visto verde que no se ganó.
 */
export async function testConnection(
  apiKeyOrRestaurantId: string,
  provider: OseProvider,
  options: { endpoint?: string | null; apiSecret?: string | null } = {}
): Promise<ConnectionTest> {
  const adapter = adapterFor(provider);
  const meta = OSE_PROVIDER_META[provider];

  if (adapter) {
    const result = await adapter.test({
      apiKey: apiKeyOrRestaurantId,
      apiSecret: options.apiSecret ?? null,
      endpoint: options.endpoint ?? null,
      certificate: null,
      certificatePassword: null,
    });
    return {
      passed: result.ok,
      message: result.message,
      credentialVerified: result.ok,
    };
  }

  if (meta.needsEndpoint) {
    if (!options.endpoint) {
      return {
        passed: false,
        message: "Falta la URL de tu cuenta en el OSE.",
        credentialVerified: false,
      };
    }
    const probe = await probeEndpoint(options.endpoint);
    return {
      passed: probe.ok,
      message: probe.ok
        ? `${probe.message} Tu credencial quedó guardada y cifrada; ${meta.label} la valida al emitir el primer comprobante.`
        : probe.message,
      credentialVerified: false,
    };
  }

  return {
    passed: true,
    message: `Credencial guardada y cifrada. ${meta.label} la valida al emitir el primer comprobante.`,
    credentialVerified: false,
  };
}

/** Igual que el anterior, pero leyendo lo que ya está guardado del local. */
export async function testStoredConnection(restaurantId: string): Promise<ConnectionTest> {
  const resolved = await resolveIssuer(restaurantId);
  if (!resolved.ok) {
    return { passed: false, message: resolved.message, credentialVerified: false };
  }
  const { issuer } = resolved;
  const result = await testConnection(issuer.credentials.apiKey, issuer.provider, {
    endpoint: issuer.credentials.endpoint,
    apiSecret: issuer.credentials.apiSecret,
  });

  await prisma.billingCredentials.updateMany({
    where: { restaurantId },
    data: {
      lastTestAt: new Date(),
      lastTestOk: result.passed,
      lastTestMessage: result.message.slice(0, 300),
    },
  });

  return result;
}

export type Venta = {
  documentType: "boleta" | "factura";
  series: string;
  number: number;
  issuedAt: Date;
  customer: EmissionRequest["customer"];
  lines: EmissionRequest["lines"];
  total: number;
};

/**
 * Manda una venta al OSE del restaurante.
 *
 * No toca correlativos ni escribe nada: recibe el número ya sacado y devuelve
 * lo que contestó el operador. Quien guarda es `emission.ts`, para que la
 * escritura del CDR sea un solo camino y no uno por cada llamador.
 */
export async function emitDocument(
  issuer: ResolvedIssuer,
  venta: Venta
): Promise<EmissionResult> {
  return emitComprobante(issuer.provider, {
    documentType: venta.documentType,
    series: venta.series,
    number: venta.number,
    issuedAt: venta.issuedAt,
    issuer: {
      ruc: issuer.ruc,
      legalName: issuer.legalName,
      tradeName: issuer.tradeName,
      address: issuer.address,
    },
    customer: venta.customer,
    lines: venta.lines,
    total: venta.total,
    igvRate: issuer.igvRate,
    taxed: issuer.taxed,
    credentials: issuer.credentials,
  });
}

/**
 * Cómo se archiva cada desenlace.
 *
 * `retryable` es la decisión que importa: solo un fallo de red o de cola vuelve
 * a intentarse. Un rechazo de SUNAT es definitivo — el correlativo ya se gastó
 * y lo que corresponde es emitir un documento nuevo, no repetir este.
 */
export type ParsedEmission = {
  estado: "ACEPTADO" | "RECHAZADO" | "PENDIENTE";
  retryable: boolean;
  message: string;
  documentNo: string | null;
  hash: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  sunatCode: string | null;
};

export function parseResponse(result: EmissionResult): ParsedEmission {
  if (result.ok) {
    return {
      estado: "ACEPTADO",
      retryable: false,
      message: result.message,
      documentNo: result.documentNo,
      hash: result.hash,
      pdfUrl: result.link,
      xmlUrl: result.xmlLink,
      sunatCode: result.sunatCode,
    };
  }

  const retryable = result.code === "network";
  return {
    // Un "todavía no está configurado" no es un rechazo de SUNAT: el documento
    // sigue vivo y se emitirá en cuanto el local termine de configurarse.
    estado: result.code === "rejected" ? "RECHAZADO" : "PENDIENTE",
    retryable,
    message:
      result.code === "not_implemented" ? NOT_IMPLEMENTED_MESSAGE : result.message,
    documentNo: null,
    hash: null,
    pdfUrl: null,
    xmlUrl: null,
    sunatCode: null,
  };
}
