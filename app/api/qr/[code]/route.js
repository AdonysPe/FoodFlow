import QRCode from "qrcode";
import { prisma } from "@/lib/db/prisma";
import { normalizeTableCode, tableOrderUrl } from "@/lib/tableCode";
import { SITE_URL } from "@/lib/seo";
import { rateLimit } from "@/lib/security/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";

/**
 * The QR image for one table, as SVG.
 *
 * Rendered on the server so the QR library never reaches the browser bundle —
 * the dashboard and the print sheet just point an `<img>` here. A code never
 * changes once printed, so the response is immutable and the browser asks for
 * it exactly once.
 *
 * Only codes that belong to a real table are drawn: this is a QR for a table,
 * not an open encoder anyone can point at any string.
 */
export async function GET(_request, { params }) {
  const limit = await rateLimit("table-qr", await callerIpHash(), {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return new Response("Demasiadas solicitudes", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const { code: raw } = await params;
  const code = normalizeTableCode(raw);
  if (code.length !== 10) {
    return new Response("Código no válido", { status: 400 });
  }

  const table = await prisma.restaurantTable.findUnique({
    where: { publicCode: code },
    select: { id: true },
  });
  if (!table) return new Response("No encontrado", { status: 404 });

  const svg = await QRCode.toString(tableOrderUrl(code, SITE_URL), {
    type: "svg",
    // Level M survives a scratched sticker without making the pattern dense.
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0c0908", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
