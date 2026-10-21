import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import PrintButton from "@/components/dashboard/mesas/PrintButton";
import { ZONE_LABELS } from "@/lib/tableMeta";
import { SITE_URL } from "@/lib/seo";
import type { TableZoneValue } from "@/lib/tableMeta";

export const metadata = {
  title: "QR de mesas",
};

/**
 * The sheet a venue prints once and tapes to its tables.
 *
 * Built for paper first: white cards on a white page, a wide quiet zone around
 * each code, and the table name large enough to read while holding the sheet —
 * a printed QR is only useful if whoever is sticking them down can tell which
 * card belongs to which table.
 */
export default async function TableQrSheetPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("tables");
  if (!allowed) return <PlanGate feature="tables" plan={plan} />;
  if (!restaurant) return null;

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id, active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { id: true, name: true, zone: true, capacity: true, publicCode: true },
  });

  const printable = tables.filter((t) => t.publicCode);

  // What the codes on this sheet actually point at. It comes from
  // NEXT_PUBLIC_SITE_URL, so a sheet printed from a laptop encodes
  // http://localhost and the stickers work on nobody's phone — a mistake you
  // only discover after cutting them out and taping them to the tables.
  const origin = SITE_URL.replace(/\/$/, "");
  const printSafe = origin.startsWith("https://");

  return (
    <div className="lbd-pg">
      <div className="lbd-qr-head lbd-rise">
        <div>
          <Link href="/dashboard/app/mesas" className="lbd-ad-back">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Volver al plano
          </Link>
          <span className="lbd-mono lbd-qr-eyebrow">SERVICIO · MESAS · QR</span>
          <h1 className="lbd-ph-h1">
            QR de mesas<span style={{ color: "#ff5a33" }}>.</span>
          </h1>
          <p className="lbd-qr-sub">Imprime esta hoja, recorta y pega un código en cada mesa. El comensal lo escanea y pide desde su sitio.</p>
        </div>
        <PrintButton />
      </div>

      {!printSafe && (
        <div className="lbd-qr-warn lbd-rise" role="status" style={{ animationDelay: ".05s" }}>
          <span aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5M12 16.5h.01M10.3 3.9L2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <p>
            <strong>No imprimas todavía.</strong> Estos códigos apuntan a <span className="lbd-mono">{origin}</span>, que solo existe en esta computadora. Abre esta hoja desde foodflow.site para que los QR lleven a tu carta de verdad.
          </p>
        </div>
      )}

      {printable.length === 0 ? (
        <p className="lbd-card lbd-qr-empty">Aún no hay mesas activas que imprimir.</p>
      ) : (
        <>
          <div className="lbd-qr-count lbd-rise" style={{ animationDelay: ".08s" }}>
            <span>
              {printable.length} {printable.length === 1 ? "código" : "códigos"} · uno por mesa activa
            </span>
            <span>
              <i aria-hidden="true" />
              Cada QR lleva a la carta de su mesa
            </span>
          </div>
          <div className="lbd-qr-sheet">
            {printable.map((table, index) => (
              <article key={table.id} className="lbd-qr-card" style={{ animationDelay: `${Math.min(index, 12) * 0.04}s` }}>
                <span className="lbd-mono lbd-qr-venue">{restaurant.name.toUpperCase()}</span>
                <span className="lbd-display lbd-qr-name">
                  {table.name}
                  <span style={{ color: "#ff5a33" }}>.</span>
                </span>
                <span className="lbd-qr-meta">
                  {ZONE_LABELS[table.zone as TableZoneValue] ?? table.zone} · {table.capacity} personas
                </span>
                <span className="lbd-qr-code">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/qr/${table.publicCode}`} alt={`Código QR de ${table.name}`} width={180} height={180} />
                </span>
                <span className="lbd-qr-cta">Escanea y pide desde tu mesa</span>
                <span className="lbd-mono lbd-qr-url">
                  {origin.replace(/^https?:\/\//, "")}/m/{table.publicCode}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
