import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import PrintButton from "@/components/dashboard/mesas/PrintButton";
import { ZONE_LABELS } from "@/lib/tableMeta";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">
            QR de mesas
          </h2>
          <p className="mt-0.5 text-[13px] text-faint">
            Imprime esta hoja, recorta y pega un código en cada mesa. El comensal lo escanea
            y pide desde su sitio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/app/mesas"
            className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-2 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
          >
            Volver al plano
          </Link>
          <PrintButton />
        </div>
      </div>

      {printable.length === 0 ? (
        <p className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-10 text-center text-[14px] text-faint print:hidden">
          Aún no hay mesas activas que imprimir.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-6">
          {printable.map((table) => (
            <article
              key={table.id}
              className="flex break-inside-avoid flex-col items-center rounded-2xl border border-fg/[0.1] bg-white p-5 text-center print:border-black/20"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                {restaurant.name}
              </p>
              <p className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-black">
                {table.name}
              </p>
              <p className="mt-1 text-[12px] text-black/45">
                {ZONE_LABELS[table.zone as TableZoneValue] ?? table.zone} · {table.capacity}{" "}
                personas
              </p>

              <img
                src={`/api/qr/${table.publicCode}`}
                alt={`Código QR de ${table.name}`}
                width={190}
                height={190}
                className="mt-4 h-[190px] w-[190px]"
              />

              <p className="mt-3 text-[13px] font-semibold text-black">
                Escanea y pide desde tu mesa
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] tracking-wide text-black/40">
                {table.publicCode}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
