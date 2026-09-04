import { prisma } from "@/lib/db/prisma";
import {
  RECEIPT_DEFAULTS,
  normalizePaperWidth,
  type ReceiptSettingsDTO,
} from "@/lib/receipt";

type Row = {
  legalName: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  footerNote: string | null;
  paperWidth: number;
  showIgv: boolean;
  igvRate: number;
  autoPrint: boolean;
  series: string;
  tradeName: string | null;
  logoDataUrl: string | null;
  showQr: boolean;
  showCustomerRuc: boolean;
};

export function toSettingsDTO(row: Row | null): ReceiptSettingsDTO {
  if (!row) return RECEIPT_DEFAULTS;
  return {
    legalName: row.legalName,
    ruc: row.ruc,
    address: row.address,
    phone: row.phone,
    footerNote: row.footerNote,
    paperWidth: normalizePaperWidth(row.paperWidth),
    showIgv: row.showIgv,
    igvRate: row.igvRate,
    autoPrint: row.autoPrint,
    series: row.series,
    tradeName: row.tradeName,
    logoDataUrl: row.logoDataUrl,
    showQr: row.showQr,
    showCustomerRuc: row.showCustomerRuc,
  };
}

const SELECT = {
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
  tradeName: true,
  logoDataUrl: true,
  showQr: true,
  showCustomerRuc: true,
} as const;

/**
 * Read-only lookup. A venue that has never opened the settings page has no
 * row, and gets the defaults rather than an error — its tickets still print.
 */
export async function readReceiptSettings(
  restaurantId: string
): Promise<ReceiptSettingsDTO> {
  const row = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: SELECT,
  });
  return toSettingsDTO(row);
}

/**
 * Hands back the next document number for this venue, creating the settings
 * row the first time a venue charges.
 *
 * The increment happens inside the update so Postgres, not this process,
 * decides the value — two waiters hitting "Cobrar" at the same second get two
 * different numbers instead of both reading the same counter.
 */
export async function nextReceiptNumber(
  restaurantId: string
): Promise<{ series: string; number: number }> {
  try {
    const bumped = await prisma.receiptSettings.update({
      where: { restaurantId },
      data: { counter: { increment: 1 } },
      select: { series: true, counter: true },
    });
    return { series: bumped.series, number: bumped.counter };
  } catch {
    // No row yet. Creating it can lose a race against another first sale, in
    // which case the retry finds the row and increments it normally.
    try {
      const created = await prisma.receiptSettings.create({
        data: { restaurantId, counter: 1 },
        select: { series: true, counter: true },
      });
      return { series: created.series, number: created.counter };
    } catch {
      const bumped = await prisma.receiptSettings.update({
        where: { restaurantId },
        data: { counter: { increment: 1 } },
        select: { series: true, counter: true },
      });
      return { series: bumped.series, number: bumped.counter };
    }
  }
}
