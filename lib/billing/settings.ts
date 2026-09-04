// Shapes and derived state for Configuración → Facturación.
//
// No Prisma and no "use server": the settings page reads the row and maps it
// here, and the client form imports the same types and the same checklist, so
// the badge the owner sees is computed from one rule instead of two.

import { checkEndpoint, checkRuc, checkSeries } from "@/lib/billing/validation";
import { OSE_PROVIDER_META, isOseProvider, type OseProvider } from "@/lib/billing/providers";
import type { PaperWidth } from "@/lib/receipt";

export type BillingSettingsDTO = {
  // Sección 1 — datos del contribuyente
  ruc: string;
  legalName: string;
  tradeName: string;
  address: string;
  phone: string;
  sunatEmail: string;

  // Sección 3 — OSE
  oseProvider: OseProvider | "";
  oseEndpoint: string;

  // Sección 4 — series
  boletaSeries: string;
  boletaNext: number;
  facturaSeries: string;
  facturaNext: number;
  creditSeries: string;
  creditNext: number;

  // Sección 5 — ticket
  logoDataUrl: string | null;
  footerNote: string;
  showQr: boolean;
  showCustomerRuc: boolean;
  paperWidth: PaperWidth;
  showIgv: boolean;
  autoPrint: boolean;
  igvRate: number;

  updatedAt: string | null;
};

/** What the settings page knows about the uploaded .pfx without opening it. */
export type CertificateStatusDTO = {
  fileName: string | null;
  subject: string | null;
  expiresAt: string | null;
  uploadedAt: string | null;
};

export type OseStatusDTO = {
  hasApiKey: boolean;
  hasSecret: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
};

export type CertificateState = "none" | "valid" | "expiring" | "expired" | "unknown";

/** 30 days out is when a venue still has time to renew without closing. */
export const CERT_WARN_DAYS = 30;

export function certificateState(
  cert: CertificateStatusDTO,
  now: Date = new Date()
): CertificateState {
  if (!cert.fileName) return "none";
  if (!cert.expiresAt) return "unknown";
  const expires = new Date(cert.expiresAt);
  if (Number.isNaN(expires.getTime())) return "unknown";
  const days = (expires.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return "expired";
  if (days <= CERT_WARN_DAYS) return "expiring";
  return "valid";
}

export function daysUntil(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.ceil((then.getTime() - now.getTime()) / 86_400_000);
}

export type ChecklistItem = {
  key: "identity" | "certificate" | "ose" | "series";
  label: string;
  done: boolean;
  /** Why it is not done yet, or what is on file when it is. */
  detail: string;
};

export function billingChecklist(
  settings: BillingSettingsDTO,
  cert: CertificateStatusDTO,
  ose: OseStatusDTO,
  now: Date = new Date()
): ChecklistItem[] {
  const identityMissing: string[] = [];
  if (checkRuc(settings.ruc)) identityMissing.push("RUC");
  if (!settings.legalName.trim()) identityMissing.push("razón social");
  if (!settings.address.trim()) identityMissing.push("dirección fiscal");
  if (!settings.sunatEmail.trim()) identityMissing.push("correo de notificación");

  const certState = certificateState(cert, now);

  const provider = isOseProvider(settings.oseProvider) ? settings.oseProvider : null;
  const needsEndpoint = provider ? OSE_PROVIDER_META[provider].needsEndpoint : true;
  const needsSecret = provider ? OSE_PROVIDER_META[provider].needsSecret : false;
  const oseReady =
    provider != null &&
    ose.hasApiKey &&
    (!needsSecret || ose.hasSecret) &&
    (!needsEndpoint || checkEndpoint(settings.oseEndpoint) === null);

  const seriesProblem =
    checkSeries(settings.boletaSeries, "boleta") ??
    checkSeries(settings.facturaSeries, "factura") ??
    checkSeries(settings.creditSeries, "credit");

  return [
    {
      key: "identity",
      label: "Datos del restaurante completos",
      done: identityMissing.length === 0,
      detail:
        identityMissing.length === 0
          ? `RUC ${settings.ruc} · ${settings.legalName}`
          : `Falta: ${identityMissing.join(", ")}.`,
    },
    {
      key: "certificate",
      label: "Certificado digital válido",
      done: certState === "valid" || certState === "expiring",
      detail:
        certState === "none"
          ? "No has subido tu certificado."
          : certState === "expired"
            ? "Tu certificado venció. Renuévalo en SUNAT y súbelo de nuevo."
            : certState === "unknown"
              ? "Está guardado, pero no pudimos leer su fecha de vencimiento."
              : certState === "expiring"
                ? `Vence en ${daysUntil(cert.expiresAt, now)} días.`
                : `Válido hasta ${formatDay(cert.expiresAt)}.`,
    },
    {
      key: "ose",
      label: "API del OSE configurada",
      done: oseReady,
      detail: !provider
        ? "Elige tu proveedor OSE."
        : !ose.hasApiKey
          ? `Falta la credencial de ${OSE_PROVIDER_META[provider].label}.`
          : needsSecret && !ose.hasSecret
            ? "Falta el API Secret."
            : needsEndpoint && checkEndpoint(settings.oseEndpoint)
              ? "Falta la URL de tu cuenta en el OSE."
              : ose.lastTestOk === true
                ? `${OSE_PROVIDER_META[provider].label} · conexión probada.`
                : `${OSE_PROVIDER_META[provider].label} · sin probar todavía.`,
    },
    {
      key: "series",
      label: "Series configuradas",
      done: seriesProblem === null,
      detail:
        seriesProblem ??
        `Boletas ${settings.boletaSeries} · Facturas ${settings.facturaSeries} · NC ${settings.creditSeries}`,
    },
  ];
}

export type BillingReadiness = "complete" | "incomplete" | "unset";

export function billingReadiness(items: ChecklistItem[]): BillingReadiness {
  if (items.every((i) => i.done)) return "complete";
  if (items.some((i) => i.done)) return "incomplete";
  return "unset";
}

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
}

export { formatDay as formatBillingDate };
