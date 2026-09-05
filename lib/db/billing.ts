// Reads for Configuración → Facturación.
//
// The two tables are read separately on purpose: `ReceiptSettings` is the
// configuration every screen may see, `BillingCredentials` is the encrypted
// half and is only ever touched here and by the emission path.

import { prisma } from "@/lib/db/prisma";
import { maskSecret, tryDecryptSecret } from "@/lib/billing/crypto";
import { isOseProvider } from "@/lib/billing/providers";
import { drawCorrelative, type SeriesKind } from "@/lib/billing/correlatives";
import type {
  BillingSettingsDTO,
  CertificateStatusDTO,
  OseStatusDTO,
} from "@/lib/billing/settings";
import { normalizePaperWidth } from "@/lib/receipt";

const SETTINGS_SELECT = {
  legalName: true,
  ruc: true,
  address: true,
  phone: true,
  footerNote: true,
  paperWidth: true,
  showIgv: true,
  igvRate: true,
  autoPrint: true,
  series: true,
  counter: true,
  tradeName: true,
  sunatEmail: true,
  boletaSeries: true,
  boletaCounter: true,
  facturaSeries: true,
  facturaCounter: true,
  creditSeries: true,
  creditCounter: true,
  oseProvider: true,
  oseEndpoint: true,
  logoDataUrl: true,
  showQr: true,
  showCustomerRuc: true,
  updatedAt: true,
} as const;

export type BillingConfig = {
  settings: BillingSettingsDTO;
  cert: CertificateStatusDTO;
  ose: OseStatusDTO;
  /** Last four characters of the stored credential, so the owner recognises it. */
  apiKeyHint: string | null;
  secretHint: string | null;
  /** Next internal nota de venta, shown alongside the electronic series. */
  notaVentaSeries: string;
  notaVentaNext: number;
  /** How many comprobantes this venue has issued in the running month. */
  issuedThisMonth: number;
};

export async function readBillingConfig(restaurantId: string): Promise<BillingConfig> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [row, creds, issuedThisMonth] = await Promise.all([
    prisma.receiptSettings.findUnique({
      where: { restaurantId },
      select: SETTINGS_SELECT,
    }),
    prisma.billingCredentials.findUnique({ where: { restaurantId } }),
    prisma.order.count({
      where: { restaurantId, paidAt: { gte: monthStart }, voidedAt: null },
    }),
  ]);

  const apiKey = tryDecryptSecret(creds?.oseApiKeyEnc ?? null);
  const apiSecret = tryDecryptSecret(creds?.oseApiSecretEnc ?? null);

  const settings: BillingSettingsDTO = {
    ruc: row?.ruc ?? "",
    legalName: row?.legalName ?? "",
    tradeName: row?.tradeName ?? "",
    address: row?.address ?? "",
    phone: row?.phone ?? "",
    sunatEmail: row?.sunatEmail ?? "",

    oseProvider: isOseProvider(row?.oseProvider) ? row.oseProvider : "",
    oseEndpoint: row?.oseEndpoint ?? "",

    boletaSeries: row?.boletaSeries ?? "B001",
    boletaNext: (row?.boletaCounter ?? 0) + 1,
    facturaSeries: row?.facturaSeries ?? "F001",
    facturaNext: (row?.facturaCounter ?? 0) + 1,
    creditSeries: row?.creditSeries ?? "FC01",
    creditNext: (row?.creditCounter ?? 0) + 1,

    logoDataUrl: row?.logoDataUrl ?? null,
    footerNote: row?.footerNote ?? "",
    showQr: row?.showQr ?? true,
    showCustomerRuc: row?.showCustomerRuc ?? false,
    paperWidth: normalizePaperWidth(row?.paperWidth),
    showIgv: row?.showIgv ?? false,
    autoPrint: row?.autoPrint ?? true,
    igvRate: row?.igvRate ?? 0.18,

    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };

  return {
    settings,
    cert: {
      fileName: creds?.certFileName ?? null,
      subject: creds?.certSubject ?? null,
      expiresAt: creds?.certExpiresAt?.toISOString() ?? null,
      uploadedAt: creds?.certUploadedAt?.toISOString() ?? null,
    },
    ose: {
      hasApiKey: apiKey != null && apiKey.length > 0,
      hasSecret: apiSecret != null && apiSecret.length > 0,
      lastTestAt: creds?.lastTestAt?.toISOString() ?? null,
      lastTestOk: creds?.lastTestOk ?? null,
      lastTestMessage: creds?.lastTestMessage ?? null,
    },
    apiKeyHint: maskSecret(apiKey),
    secretHint: maskSecret(apiSecret),
    notaVentaSeries: row?.series ?? "NV01",
    notaVentaNext: (row?.counter ?? 0) + 1,
    issuedThisMonth,
  };
}

/** The credentials the emission path needs, decrypted, or null if incomplete. */
export async function readOseCredentials(restaurantId: string) {
  const creds = await prisma.billingCredentials.findUnique({ where: { restaurantId } });
  if (!creds) return null;
  const apiKey = tryDecryptSecret(creds.oseApiKeyEnc);
  if (!apiKey) return null;
  return {
    apiKey,
    apiSecret: tryDecryptSecret(creds.oseApiSecretEnc),
    certificate: tryDecryptSecret(creds.certDataEnc),
    certificatePassword: tryDecryptSecret(creds.certPasswordEnc),
    certExpiresAt: creds.certExpiresAt,
  };
}

export type { SeriesKind as ElectronicSeriesKind } from "@/lib/billing/correlatives";

/**
 * Draws the next correlative for an electronic document type.
 *
 * Thin alias kept for the callers that already import it from here; the rule
 * (one draw per document, Postgres does the increment, a retry reuses its own
 * number) lives in lib/billing/correlatives.ts.
 */
export async function nextElectronicNumber(
  restaurantId: string,
  kind: SeriesKind
): Promise<{ series: string; number: number }> {
  const drawn = await drawCorrelative(restaurantId, kind);
  return { series: drawn.series, number: drawn.number };
}

/**
 * What the till needs to know before it offers a boleta or a factura.
 *
 * `ready` is the gate behind Componente 8: false disables the SUNAT button and
 * leaves the waiter the internal nota de venta, which always works. `missing`
 * is the list the warning spells out, so nobody has to guess which field of
 * Configuración › Facturación is empty.
 */
export type TillBillingState = {
  ready: boolean;
  missing: string[];
  boletaSeries: string;
  boletaNext: number;
  facturaSeries: string;
  facturaNext: number;
};

export async function readTillBillingState(
  restaurantId: string
): Promise<TillBillingState> {
  const [row, creds] = await Promise.all([
    prisma.receiptSettings.findUnique({
      where: { restaurantId },
      select: {
        ruc: true,
        legalName: true,
        oseProvider: true,
        boletaSeries: true,
        boletaCounter: true,
        facturaSeries: true,
        facturaCounter: true,
      },
    }),
    prisma.billingCredentials.findUnique({
      where: { restaurantId },
      select: { oseApiKeyEnc: true, certDataEnc: true, certExpiresAt: true },
    }),
  ]);

  const missing: string[] = [];
  if (!row?.ruc) missing.push("el RUC");
  if (!row?.legalName) missing.push("la razón social");
  if (!isOseProvider(row?.oseProvider)) missing.push("el proveedor OSE");
  if (!creds?.oseApiKeyEnc) missing.push("la credencial del OSE");
  if (!creds?.certDataEnc) missing.push("el certificado digital");
  else if (creds.certExpiresAt && creds.certExpiresAt.getTime() < Date.now()) {
    missing.push("un certificado vigente (el tuyo venció)");
  }

  return {
    ready: missing.length === 0,
    missing,
    boletaSeries: row?.boletaSeries ?? "B001",
    boletaNext: (row?.boletaCounter ?? 0) + 1,
    facturaSeries: row?.facturaSeries ?? "F001",
    facturaNext: (row?.facturaCounter ?? 0) + 1,
  };
}
