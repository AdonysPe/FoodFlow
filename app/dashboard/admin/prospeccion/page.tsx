import { prisma } from "@/lib/db/prisma";
import PageHeader from "@/components/dashboard/PageHeader";
import ProspectsBoard, { type ProspectRow } from "@/components/dashboard/ProspectsBoard";
import { placesKey } from "@/lib/prospecting/places";
import { ALL_QUERIES, CRON_OSM_DISTRICTS_PER_DAY, CRON_SEARCHES_PER_DAY, DISTRICTS, DISTRICT_GROUPS } from "@/lib/prospecting/searches";
import { hasOwnWebsite } from "@/lib/prospecting/score";
import { MAX_TOUCHES, draftMessage, nextFollowUpAt } from "@/lib/prospecting/message";
import type { Prospect } from "@prisma/client";

export const metadata = {
  title: "Prospección",
};

// "Buscar ahora" runs up to 9 Google requests, or one OpenStreetMap district
// of several hundred rows, inside this page's function.
export const maxDuration = 60;

// The best unsent prospects worth loading. Lima has thousands of venues; the
// list is worked from the top, and the rest wait for their turn.
const NEW_LIMIT = 300;
const DISCARDED_LIMIT = 100;

function toRow(p: Prospect, now: Date): ProspectRow {
  const inSequence = (p.status === "nuevo" || p.status === "contactado") && p.touches < MAX_TOUCHES;
  const dueAt = nextFollowUpAt(p.touches, p.lastTouchAt);
  return {
    id: p.id,
    name: p.name,
    district: p.district,
    address: p.address,
    phone: p.phone,
    mobile: p.mobile,
    website: p.website,
    ownWebsite: hasOwnWebsite(p.website),
    mapsUrl: p.mapsUrl,
    category: p.category,
    segment: p.segment,
    rating: p.rating,
    reviewCount: p.reviewCount,
    delivery: p.delivery,
    dineIn: p.dineIn,
    score: p.score,
    plan: p.suggestedPlan,
    isChain: p.isChain,
    status: p.status,
    touches: p.touches,
    lastTouchAt: p.lastTouchAt?.toISOString() ?? null,
    dueAt: dueAt?.toISOString() ?? null,
    due: p.status === "contactado" && dueAt != null && dueAt <= now,
    draft: inSequence ? draftMessage({ name: p.name, segment: p.segment, rating: p.rating, reviewCount: p.reviewCount, source: p.source, district: p.district }, p.touches) : null,
    foundBy: p.foundBy,
    source: p.source,
  };
}

/**
 * Prospección: restaurants found on Google Maps, scored, with the WhatsApp
 * message already drafted. The cron fills it every morning; "Buscar ahora"
 * fills one district on demand. Sending stays a human tap from the FoodFlow
 * number — see lib/prospecting/message.ts for why.
 */
export default async function ProspeccionPage() {
  const now = new Date();
  const hasKey = placesKey() != null;
  const [fresh, working, discarded, counts] = await Promise.all([
    prisma.prospect.findMany({ where: { status: "nuevo" }, orderBy: [{ score: "desc" }, { reviewCount: "desc" }], take: NEW_LIMIT }),
    prisma.prospect.findMany({ where: { status: { in: ["contactado", "respondio", "cliente"] } }, orderBy: { updatedAt: "desc" } }),
    prisma.prospect.findMany({ where: { status: "descartado" }, orderBy: { updatedAt: "desc" }, take: DISCARDED_LIMIT }),
    prisma.prospect.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totals = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<Prospect["status"], number>>;
  const rows = [...fresh, ...working, ...discarded].map((p) => toRow(p, now));

  return (
    <div className="lbd-pg">
      <PageHeader
        eyebrow="VENTAS · PROSPECCIÓN"
        title="Prospección"
        description="Restaurantes de Lima sacados de OpenStreetMap y Google Maps, puntuados y con el mensaje listo. Tú das el clic para enviarlo desde WhatsApp."
      />
      <ProspectsBoard
        prospects={rows}
        totals={{
          nuevo: totals.nuevo ?? 0,
          contactado: totals.contactado ?? 0,
          respondio: totals.respondio ?? 0,
          cliente: totals.cliente ?? 0,
          descartado: totals.descartado ?? 0,
        }}
        hasKey={hasKey}
        districtGroups={DISTRICT_GROUPS}
        sweepDays={hasKey ? Math.ceil(ALL_QUERIES.length / CRON_SEARCHES_PER_DAY) : Math.ceil(DISTRICTS.length / CRON_OSM_DISTRICTS_PER_DAY)}
      />
    </div>
  );
}
