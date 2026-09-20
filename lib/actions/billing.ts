"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { ActionResult } from "@/lib/actions/auth";
import { billingCryptoReady, encryptSecret, tryDecryptSecret } from "@/lib/billing/crypto";
import { inspectCertificate } from "@/lib/billing/certificate";
import { probeEndpoint } from "@/lib/billing/http";
import { OSE_PROVIDERS, OSE_PROVIDER_META, isOseProvider } from "@/lib/billing/providers";
import {
  checkCounter,
  checkEmail,
  checkEndpoint,
  checkPhone,
  checkRequired,
  checkRuc,
  checkSeries,
} from "@/lib/billing/validation";

const REVALIDATE = [
  "/dashboard/app/configuracion/facturacion",
  "/dashboard/comanda",
  "/dashboard/app/orders",
];

function revalidateBilling() {
  for (const path of REVALIDATE) revalidatePath(path);
}

const text = (max: number) => z.string().trim().max(max);

const settingsSchema = z.object({
  // ---- Sección 1
  ruc: text(11),
  legalName: text(160),
  tradeName: text(120),
  address: text(200),
  phone: text(40),
  sunatEmail: text(160),

  // ---- Sección 3
  oseProvider: z.enum(["", ...OSE_PROVIDERS]),
  oseEndpoint: text(300),
  // Empty means "leave what is stored alone" — the form never sees the value.
  apiKey: text(400),
  apiSecret: text(400),
  clearApiKey: z.boolean(),
  clearApiSecret: z.boolean(),

  // ---- Sección 4
  boletaSeries: text(4),
  boletaNext: z.coerce.number().int(),
  facturaSeries: text(4),
  facturaNext: z.coerce.number().int(),
  creditSeries: text(4),
  creditNext: z.coerce.number().int(),

  // ---- Sección 5
  logoDataUrl: z.string().max(400_000).nullable(),
  footerNote: text(200),
  showQr: z.boolean(),
  showCustomerRuc: z.boolean(),
  paperWidth: z.coerce.number().int().refine((v) => v === 58 || v === 80),
  showIgv: z.boolean(),
  autoPrint: z.boolean(),
});

export type BillingSettingsInput = z.input<typeof settingsSchema>;

/**
 * Saves everything on the facturación page except the certificate.
 *
 * Runs the same `check*` functions the form runs on blur, so a value that got
 * past the browser (an old tab, a script, a disabled field) is refused here
 * with the identical sentence the owner would have seen inline.
 */
export async function saveBillingSettings(
  input: BillingSettingsInput
): Promise<ActionResult<{ updatedAt: string }>> {
  const { restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  // Billing credentials are the owner's alone — a restaurant_admin passes
  // requireClientRestaurant() same as the owner, so this has to be checked
  // separately, same as app/api/restaurants/[id]/billing-config/route.ts.
  if (!isOwner) {
    return { ok: false, error: "Solo el dueño de la cuenta puede cambiar la configuración de facturación." };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const v = parsed.data;

  const provider = isOseProvider(v.oseProvider) ? v.oseProvider : null;

  // Sections 1 and 4 are the ones SUNAT reads; they are validated whether or
  // not the venue finished configuring the OSE, because a wrong RUC saved
  // today is a wrong RUC on every comprobante the day the OSE is connected.
  const problems = [
    v.ruc ? checkRuc(v.ruc) : null,
    v.legalName ? checkRequired(v.legalName, "La razón social") : null,
    v.phone ? checkPhone(v.phone) : null,
    v.sunatEmail ? checkEmail(v.sunatEmail) : null,
    checkSeries(v.boletaSeries, "boleta"),
    checkSeries(v.facturaSeries, "factura"),
    checkSeries(v.creditSeries, "credit"),
    checkCounter(v.boletaNext),
    checkCounter(v.facturaNext),
    checkCounter(v.creditNext),
    provider && OSE_PROVIDER_META[provider].needsEndpoint && v.oseEndpoint
      ? checkEndpoint(v.oseEndpoint)
      : null,
  ].filter((p): p is string => p != null);

  if (problems.length > 0) return { ok: false, error: problems[0] };

  if (v.showIgv && !v.ruc) {
    return { ok: false, error: "Para desglosar el IGV primero registra tu RUC." };
  }

  if (v.logoDataUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(v.logoDataUrl)) {
    return { ok: false, error: "El logo debe ser una imagen PNG, JPG o WebP." };
  }

  const wantsSecrets = v.apiKey.length > 0 || v.apiSecret.length > 0;
  if (wantsSecrets && !billingCryptoReady()) {
    return {
      ok: false,
      error:
        "Este servidor no tiene configurada la clave de cifrado (BILLING_ENCRYPTION_KEY). Sin ella no guardamos credenciales.",
    };
  }

  // A correlative is stored as "documents already issued", so what the owner
  // typed as "the next one" is that minus one. Moving it backwards would make
  // SUNAT see a repeated number, so the counter only ever goes up.
  const current = await prisma.receiptSettings.findUnique({
    where: { restaurantId: restaurant.id },
    select: { boletaCounter: true, facturaCounter: true, creditCounter: true },
  });

  const counters = {
    boletaCounter: Math.max(v.boletaNext - 1, current?.boletaCounter ?? 0),
    facturaCounter: Math.max(v.facturaNext - 1, current?.facturaCounter ?? 0),
    creditCounter: Math.max(v.creditNext - 1, current?.creditCounter ?? 0),
  };

  const data = {
    ruc: v.ruc || null,
    legalName: v.legalName || null,
    tradeName: v.tradeName || null,
    address: v.address || null,
    phone: v.phone || null,
    sunatEmail: v.sunatEmail || null,
    oseProvider: provider,
    oseEndpoint: v.oseEndpoint || null,
    boletaSeries: v.boletaSeries.toUpperCase(),
    facturaSeries: v.facturaSeries.toUpperCase(),
    creditSeries: v.creditSeries.toUpperCase(),
    ...counters,
    logoDataUrl: v.logoDataUrl,
    footerNote: v.footerNote || null,
    showQr: v.showQr,
    showCustomerRuc: v.showCustomerRuc,
    paperWidth: v.paperWidth,
    showIgv: v.showIgv,
    autoPrint: v.autoPrint,
  };

  const saved = await prisma.receiptSettings.upsert({
    where: { restaurantId: restaurant.id },
    create: { restaurantId: restaurant.id, ...data },
    update: data,
    select: { updatedAt: true },
  });

  // Credentials move in the same submit but never into the same table.
  const credentialPatch: Record<string, unknown> = {};
  if (v.clearApiKey) credentialPatch.oseApiKeyEnc = null;
  else if (v.apiKey) credentialPatch.oseApiKeyEnc = encryptSecret(v.apiKey);
  if (v.clearApiSecret) credentialPatch.oseApiSecretEnc = null;
  else if (v.apiSecret) credentialPatch.oseApiSecretEnc = encryptSecret(v.apiSecret);

  if (Object.keys(credentialPatch).length > 0) {
    // Changing the credential invalidates whatever the last test said.
    credentialPatch.lastTestAt = null;
    credentialPatch.lastTestOk = null;
    credentialPatch.lastTestMessage = null;
    await prisma.billingCredentials.upsert({
      where: { restaurantId: restaurant.id },
      create: { restaurantId: restaurant.id, ...credentialPatch },
      update: credentialPatch,
    });
  }

  revalidateBilling();
  return { ok: true, data: { updatedAt: saved.updatedAt.toISOString() } };
}

// ---------------------------------------------------------------- certificate

const MAX_CERT_BYTES = 5 * 1024 * 1024;

const certSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  // The .pfx as base64. Real certificates are a few KB; the cap is a guardrail.
  dataBase64: z.string().min(1).max(Math.ceil(MAX_CERT_BYTES * 1.4)),
  password: z.string().min(1).max(200),
});

export type CertificateUploadInput = z.input<typeof certSchema>;

export type CertificateUploadResult = {
  subject: string | null;
  expiresAt: string | null;
  /** Non-fatal: stored, but something about it deserves a second look. */
  warning: string | null;
};

export async function uploadCertificate(
  input: CertificateUploadInput
): Promise<ActionResult<CertificateUploadResult>> {
  const { restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  if (!isOwner) {
    return { ok: false, error: "Solo el dueño de la cuenta puede cambiar la configuración de facturación." };
  }

  const parsed = certSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "El archivo o la contraseña no llegaron completos." };
  }
  if (!billingCryptoReady()) {
    return {
      ok: false,
      error:
        "Este servidor no tiene configurada la clave de cifrado (BILLING_ENCRYPTION_KEY). Sin ella no guardamos tu certificado.",
    };
  }

  const { fileName, dataBase64, password } = parsed.data;
  if (!/\.(pfx|p12)$/i.test(fileName)) {
    return { ok: false, error: "El certificado debe ser un archivo .pfx o .p12." };
  }

  const der = Buffer.from(dataBase64, "base64");
  if (der.length === 0) return { ok: false, error: "El archivo llegó vacío." };
  if (der.length > MAX_CERT_BYTES) {
    return { ok: false, error: "El certificado no puede pesar más de 5 MB." };
  }

  const read = inspectCertificate(der, password);
  // A wrong password is the one failure worth stopping for: storing a container
  // nobody can open guarantees the first emission fails, weeks from now.
  if (!read.ok && read.reason === "password") {
    return { ok: false, error: read.message };
  }

  const info = read.ok ? read.info : null;
  const registeredRuc = await venueRuc(restaurant.id);
  const warning = read.ok
    ? info?.ruc && registeredRuc && info.ruc !== registeredRuc
      ? `El certificado está emitido para el RUC ${info.ruc}, distinto al que registraste. Revisa cuál corresponde.`
      : null
    : read.message;

  const patch = {
    certFileName: fileName,
    certDataEnc: encryptSecret(der.toString("base64")),
    certPasswordEnc: encryptSecret(password),
    certSubject: info?.holder ?? info?.subject ?? null,
    certExpiresAt: info?.expiresAt ?? null,
    certUploadedAt: new Date(),
  };

  await prisma.billingCredentials.upsert({
    where: { restaurantId: restaurant.id },
    create: { restaurantId: restaurant.id, ...patch },
    update: patch,
  });

  revalidateBilling();
  return {
    ok: true,
    data: {
      subject: patch.certSubject,
      expiresAt: patch.certExpiresAt?.toISOString() ?? null,
      warning,
    },
  };
}

export async function removeCertificate(): Promise<ActionResult> {
  const { restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  if (!isOwner) {
    return { ok: false, error: "Solo el dueño de la cuenta puede cambiar la configuración de facturación." };
  }

  await prisma.billingCredentials.updateMany({
    where: { restaurantId: restaurant.id },
    data: {
      certFileName: null,
      certDataEnc: null,
      certPasswordEnc: null,
      certSubject: null,
      certExpiresAt: null,
      certUploadedAt: null,
    },
  });

  revalidateBilling();
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------ connection test

/**
 * "Probar conexión".
 *
 * What it can prove today: the credential is stored and decryptable, and the
 * endpoint the owner typed is a real, public, HTTPS host that answers. What it
 * cannot prove until a provider adapter ships is that the OSE accepts the
 * credential — so it says exactly that instead of implying a green light.
 */
export async function testOseConnection(): Promise<
  ActionResult<{ passed: boolean; message: string }>
> {
  const { restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  if (!isOwner) {
    return { ok: false, error: "Solo el dueño de la cuenta puede cambiar la configuración de facturación." };
  }

  const [row, creds] = await Promise.all([
    prisma.receiptSettings.findUnique({
      where: { restaurantId: restaurant.id },
      select: { oseProvider: true, oseEndpoint: true },
    }),
    prisma.billingCredentials.findUnique({ where: { restaurantId: restaurant.id } }),
  ]);

  const provider = isOseProvider(row?.oseProvider) ? row.oseProvider : null;
  if (!provider) {
    return { ok: false, error: "Elige tu proveedor OSE y guarda antes de probar." };
  }

  const apiKey = tryDecryptSecret(creds?.oseApiKeyEnc ?? null);
  if (!apiKey) {
    return { ok: false, error: "Guarda la credencial de tu OSE antes de probar la conexión." };
  }
  const meta = OSE_PROVIDER_META[provider];
  if (meta.needsSecret && !tryDecryptSecret(creds?.oseApiSecretEnc ?? null)) {
    return { ok: false, error: `${meta.label} necesita también el API Secret.` };
  }

  let result: { passed: boolean; message: string };
  if (meta.needsEndpoint) {
    const endpointProblem = checkEndpoint(row?.oseEndpoint ?? "");
    if (endpointProblem) return { ok: false, error: endpointProblem };
    const probe = await probeEndpoint(row!.oseEndpoint!);
    result = probe.ok
      ? {
          passed: true,
          message: `${probe.message} Tu credencial quedó guardada y cifrada; ${meta.label} la valida al emitir el primer comprobante.`,
        }
      : { passed: false, message: probe.message };
  } else {
    result = {
      passed: true,
      message: `Credencial guardada y cifrada. ${meta.label} la valida al emitir el primer comprobante.`,
    };
  }

  await prisma.billingCredentials.update({
    where: { restaurantId: restaurant.id },
    data: {
      lastTestAt: new Date(),
      lastTestOk: result.passed,
      lastTestMessage: result.message.slice(0, 300),
    },
  });

  revalidateBilling();
  return { ok: true, data: result };
}

async function venueRuc(restaurantId: string): Promise<string | null> {
  const row = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: { ruc: true },
  });
  return row?.ruc ?? null;
}
