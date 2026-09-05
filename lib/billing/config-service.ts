// billingConfigService: leer, validar y guardar la configuración de facturación.
//
// DÓNDE VIVE LA CONFIGURACIÓN. En dos tablas, no en una: `ReceiptSettings`
// tiene lo que cualquier pantalla puede ver (RUC, razón social, series,
// proveedor) y `BillingCredentials` tiene lo cifrado (certificado, contraseña,
// token del OSE). La separación es la que hace que la ruta del ticket y la
// comanda no puedan arrastrar un secreto por accidente en un `include`.
//
// Este módulo es la cara única de las dos para la capa API. La página de
// Configuración sigue entrando por sus server actions (lib/actions/billing.ts),
// que validan con las mismas funciones `check*` — una regla, dos puertas.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import { billingCryptoReady, encryptSecret, tryDecryptSecret } from "@/lib/billing/crypto";
import { OSE_PROVIDER_META, isOseProvider, type OseProvider } from "@/lib/billing/providers";
import {
  checkApiKey,
  checkCounter,
  checkEmail,
  checkEndpoint,
  checkPhone,
  checkRequired,
  checkRuc,
  checkSeries,
} from "@/lib/billing/validation";
import { readBillingConfig, type BillingConfig } from "@/lib/db/billing";

export type { BillingConfig };

/** La configuración completa, sin un solo secreto en claro. */
export async function getConfig(restaurantId: string): Promise<BillingConfig> {
  return readBillingConfig(restaurantId);
}

export type SaveConfigInput = {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  correoNotificacion?: string;

  oseProvider?: string;
  oseEndpoint?: string;
  /** Vacío = deja el guardado como está. El formulario nunca lee el actual. */
  oseApiKey?: string;
  oseApiSecret?: string;

  serieBoleta?: string;
  serieFactura?: string;
  serieNc?: string;
  /** El PRÓXIMO número, que es como lo piensa el dueño (no el contador). */
  correlativoBoleta?: number;
  correlativoFactura?: number;
  correlativoNc?: number;
};

export type ValidationProblem = { field: string; message: string };

export type ValidationOutcome =
  | { ok: true }
  | { ok: false; problems: ValidationProblem[] };

/**
 * Valida lo que llegó, campo por campo.
 *
 * Solo se valida lo que viene: un PATCH que trae únicamente las series no tiene
 * por qué exigir un RUC. Lo que sí es innegociable es que un campo presente y
 * mal formado nunca se guarde — un RUC con un dígito verificador incorrecto se
 * descubre semanas después, en el primer comprobante rechazado.
 */
export function validateConfig(input: SaveConfigInput): ValidationOutcome {
  const problems: ValidationProblem[] = [];
  const add = (field: string, message: string | null) => {
    if (message) problems.push({ field, message });
  };

  if (input.ruc !== undefined && input.ruc !== "") add("ruc", checkRuc(input.ruc));
  if (input.razonSocial !== undefined && input.razonSocial !== "") {
    add("razonSocial", checkRequired(input.razonSocial, "La razón social"));
  }
  if (input.direccion !== undefined && input.direccion !== "") {
    add("direccion", checkRequired(input.direccion, "La dirección"));
  }
  if (input.telefono !== undefined && input.telefono !== "") {
    add("telefono", checkPhone(input.telefono));
  }
  if (input.correoNotificacion !== undefined && input.correoNotificacion !== "") {
    add("correoNotificacion", checkEmail(input.correoNotificacion));
  }

  const provider = input.oseProvider;
  if (provider !== undefined && provider !== "" && !isOseProvider(provider)) {
    add("oseProvider", "Ese proveedor OSE no está en la lista.");
  }
  if (input.oseEndpoint !== undefined && input.oseEndpoint !== "") {
    add("oseEndpoint", checkEndpoint(input.oseEndpoint));
  }
  if (input.oseApiKey !== undefined && input.oseApiKey !== "") {
    add("oseApiKey", checkApiKey(input.oseApiKey));
  }

  if (input.serieBoleta !== undefined) add("serieBoleta", checkSeries(input.serieBoleta, "boleta"));
  if (input.serieFactura !== undefined) {
    add("serieFactura", checkSeries(input.serieFactura, "factura"));
  }
  if (input.serieNc !== undefined) add("serieNc", checkSeries(input.serieNc, "credit"));

  if (input.correlativoBoleta !== undefined) {
    add("correlativoBoleta", checkCounter(input.correlativoBoleta));
  }
  if (input.correlativoFactura !== undefined) {
    add("correlativoFactura", checkCounter(input.correlativoFactura));
  }
  if (input.correlativoNc !== undefined) add("correlativoNc", checkCounter(input.correlativoNc));

  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}

export type SaveConfigResult =
  | { ok: true; config: BillingConfig }
  | { ok: false; problems: ValidationProblem[] };

/**
 * Guarda (o crea) la configuración del restaurante.
 *
 * Dos reglas que no se negocian:
 *
 *  1. Los correlativos solo suben. El dueño escribe "el próximo es 124" y se
 *     guarda 123 como contador; si eso fuera hacia atrás, SUNAT vería un número
 *     repetido, que es el error que no se puede deshacer.
 *  2. Un secreto vacío no borra el guardado. El formulario no conoce el valor
 *     actual, así que "no mandé nada" significa "déjalo como está", nunca
 *     "bórralo". Para borrarlo hay una acción explícita.
 */
export async function saveConfig(
  restaurantId: string,
  input: SaveConfigInput
): Promise<SaveConfigResult> {
  const validation = validateConfig(input);
  if (!validation.ok) return validation;

  const wantsSecret = Boolean(input.oseApiKey || input.oseApiSecret);
  if (wantsSecret && !billingCryptoReady()) {
    return {
      ok: false,
      problems: [
        {
          field: "oseApiKey",
          message:
            "Este servidor no tiene configurada la clave de cifrado (BILLING_ENCRYPTION_KEY). Sin ella no guardamos credenciales.",
        },
      ],
    };
  }

  const current = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: { boletaCounter: true, facturaCounter: true, creditCounter: true },
  });

  const monotonic = (next: number | undefined, stored: number) =>
    next === undefined ? undefined : Math.max(next - 1, stored);

  const data = {
    ...(input.ruc !== undefined ? { ruc: input.ruc || null } : {}),
    ...(input.razonSocial !== undefined ? { legalName: input.razonSocial || null } : {}),
    ...(input.nombreComercial !== undefined ? { tradeName: input.nombreComercial || null } : {}),
    ...(input.direccion !== undefined ? { address: input.direccion || null } : {}),
    ...(input.telefono !== undefined ? { phone: input.telefono || null } : {}),
    ...(input.correoNotificacion !== undefined
      ? { sunatEmail: input.correoNotificacion || null }
      : {}),
    ...(input.oseProvider !== undefined
      ? { oseProvider: isOseProvider(input.oseProvider) ? input.oseProvider : null }
      : {}),
    ...(input.oseEndpoint !== undefined ? { oseEndpoint: input.oseEndpoint || null } : {}),
    ...(input.serieBoleta !== undefined
      ? { boletaSeries: input.serieBoleta.toUpperCase() }
      : {}),
    ...(input.serieFactura !== undefined
      ? { facturaSeries: input.serieFactura.toUpperCase() }
      : {}),
    ...(input.serieNc !== undefined ? { creditSeries: input.serieNc.toUpperCase() } : {}),
  } satisfies Record<string, unknown>;

  const counters = {
    boletaCounter: monotonic(input.correlativoBoleta, current?.boletaCounter ?? 0),
    facturaCounter: monotonic(input.correlativoFactura, current?.facturaCounter ?? 0),
    creditCounter: monotonic(input.correlativoNc, current?.creditCounter ?? 0),
  };
  for (const [key, value] of Object.entries(counters)) {
    if (value !== undefined) (data as Record<string, unknown>)[key] = value;
  }

  await prisma.receiptSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, ...data },
    update: data,
  });

  const credentialPatch: Record<string, unknown> = {};
  if (input.oseApiKey) credentialPatch.oseApiKeyEnc = encryptSecret(input.oseApiKey);
  if (input.oseApiSecret) credentialPatch.oseApiSecretEnc = encryptSecret(input.oseApiSecret);
  if (Object.keys(credentialPatch).length > 0) {
    // Cambiar la credencial invalida lo que dijera la última prueba.
    credentialPatch.lastTestAt = null;
    credentialPatch.lastTestOk = null;
    credentialPatch.lastTestMessage = null;
    await prisma.billingCredentials.upsert({
      where: { restaurantId },
      create: { restaurantId, ...credentialPatch },
      update: credentialPatch,
    });
  }

  return { ok: true, config: await getConfig(restaurantId) };
}

export type EmissionReadiness =
  | { ready: true; provider: OseProvider }
  | { ready: false; missing: string[]; message: string };

/**
 * ¿Puede este restaurante emitir AHORA?
 *
 * Es la pregunta que hace el middleware antes de dejar pasar una emisión, y la
 * que hace la caja antes de ofrecer el botón. Devuelve la lista de lo que
 * falta, en español y en el orden en que aparece en la pantalla de
 * Configuración, para que nadie tenga que adivinar qué campo abrir.
 */
export async function checkEmissionReadiness(
  restaurantId: string
): Promise<EmissionReadiness> {
  const [row, creds] = await Promise.all([
    prisma.receiptSettings.findUnique({
      where: { restaurantId },
      select: {
        ruc: true,
        legalName: true,
        oseProvider: true,
        oseEndpoint: true,
        boletaSeries: true,
        facturaSeries: true,
      },
    }),
    prisma.billingCredentials.findUnique({
      where: { restaurantId },
      select: {
        oseApiKeyEnc: true,
        oseApiSecretEnc: true,
        certDataEnc: true,
        certExpiresAt: true,
      },
    }),
  ]);

  const missing: string[] = [];
  if (!row?.ruc) missing.push("el RUC");
  else if (checkRuc(row.ruc)) missing.push("un RUC válido");
  if (!row?.legalName) missing.push("la razón social");

  const provider = isOseProvider(row?.oseProvider) ? row.oseProvider : null;
  if (!provider) missing.push("el proveedor OSE");

  if (provider) {
    const meta = OSE_PROVIDER_META[provider];
    if (!creds?.oseApiKeyEnc || !tryDecryptSecret(creds.oseApiKeyEnc)) {
      missing.push("la credencial del OSE");
    }
    if (meta.needsSecret && !creds?.oseApiSecretEnc) missing.push("el API Secret del OSE");
    if (meta.needsEndpoint && checkEndpoint(row?.oseEndpoint ?? "")) {
      missing.push("la URL de tu cuenta en el OSE");
    }
  }

  if (!creds?.certDataEnc) missing.push("el certificado digital");
  else if (creds.certExpiresAt && creds.certExpiresAt.getTime() < Date.now()) {
    missing.push("un certificado vigente (el tuyo venció)");
  }

  if (missing.length > 0 || !provider) {
    return {
      ready: false,
      missing,
      message: `Falta ${missing.join(", ")} en Configuración › Facturación.`,
    };
  }
  return { ready: true, provider };
}
