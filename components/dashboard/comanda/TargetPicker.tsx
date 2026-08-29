"use client";

import { useMemo } from "react";
import { TABLE_STATE_LABELS, TABLE_STATE_TONE } from "@/lib/tableMeta";
import { ZONE_LABELS_ES, type ComandaTableDTO, type OpenTabDTO } from "@/lib/comandaMeta";
import { IconReceipt } from "@/components/ui/Icons";
import { formatPrice } from "@/components/dashboard/menu/ui";

export default function TargetPicker({
  tables,
  openTabs,
  onPickTable,
  onPickOther,
}: {
  tables: ComandaTableDTO[];
  openTabs: OpenTabDTO[];
  onPickTable: (t: ComandaTableDTO) => void;
  onPickOther: (kind: "pickup" | "delivery") => void;
}) {
  const tabByTable = useMemo(
    () => new Map(openTabs.map((t) => [t.tableId, t])),
    [openTabs]
  );

  const zones = useMemo(() => {
    const groups = new Map<string, ComandaTableDTO[]>();
    for (const t of tables) {
      if (!groups.has(t.zone)) groups.set(t.zone, []);
      groups.get(t.zone)!.push(t);
    }
    return [...groups.entries()];
  }, [tables]);

  const openCount = openTabs.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.01em] text-white">
          ¿Para dónde es?
        </h1>
        <p className="mt-0.5 text-[13px] text-white/45">
          {openCount > 0
            ? `${openCount} ${openCount === 1 ? "cuenta abierta" : "cuentas abiertas"} · toca la mesa para añadir o cobrar`
            : "Elige una mesa o el tipo de pedido."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onPickOther("pickup")}
          className="flex min-h-[76px] flex-col items-start justify-center gap-1 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.98]"
        >
          <span className="text-[15px] font-semibold text-white/90">Para llevar</span>
          <span className="text-[12px] text-white/40">Sin mesa</span>
        </button>
        <button
          type="button"
          onClick={() => onPickOther("delivery")}
          className="flex min-h-[76px] flex-col items-start justify-center gap-1 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.98]"
        >
          <span className="text-[15px] font-semibold text-white/90">Delivery</span>
          <span className="text-[12px] text-white/40">A domicilio</span>
        </button>
      </div>

      {tables.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-[13.5px] text-white/40">
          Aún no hay mesas. Créalas en el módulo Mesas para tomar comandas de salón.
        </p>
      ) : (
        zones.map(([zone, zoneTables]) => (
          <div key={zone}>
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/35">
              {ZONE_LABELS_ES[zone] ?? zone}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {zoneTables.map((t) => {
                const tone = TABLE_STATE_TONE[t.state];
                const tab = tabByTable.get(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPickTable(t)}
                    className="relative flex min-h-[92px] flex-col justify-between rounded-2xl border p-3 text-left transition-transform active:scale-[0.98]"
                    style={{ borderColor: tone.stroke, backgroundColor: tone.fill }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-white/90">{t.name}</span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tone.solid, boxShadow: `0 0 7px -1px ${tone.solid}` }}
                      />
                    </div>
                    <span className="text-[11.5px]" style={{ color: tone.text }}>
                      {TABLE_STATE_LABELS[t.state]} · {t.capacity}p
                    </span>
                    {tab && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[10.5px] font-semibold text-white/85">
                        <IconReceipt className="h-3 w-3" />
                        {formatPrice(tab.total)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
