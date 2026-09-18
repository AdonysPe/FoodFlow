import QRCode from "qrcode";
import { prisma } from "@/lib/db/prisma";
import { SITE_URL } from "@/lib/seo";
import { rateLimit } from "@/lib/security/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";

export const runtime = "nodejs";

/**
 * The QR a venue prints on a poster, a door or a table tent.
 *
 * Points at `/carta/<slug>` rather than the subdomain: the path works today
 * and keeps working if the wildcard DNS record is ever removed, and a printed
 * code that stops resolving is the one kind of bug you cannot patch.
 *
 * Drawn only for a slug that belongs to a real venue, so this is a QR for a
 * carta and not an encoder pointed at any string a caller likes.
 */
export async function GET(_request, { params }) {
  const limit = await rateLimit("carta-qr", await callerIpHash(), {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return new Response("Demasiadas solicitudes", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) return new Response("No encontrado", { status: 404 });

  const svg = await QRCode.toString(`${SITE_URL.replace(/\/$/, "")}/carta/${slug}`, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0c0908", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The slug can change, so this is cached for a day rather than forever.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
