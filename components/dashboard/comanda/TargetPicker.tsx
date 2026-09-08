"use client";

import { useMemo } from "react";
import { TABLE_STATE_LABELS, TABLE_STATE_TONE } from "@/lib/tableMeta";
import { ZONE_LABELS_ES, type ComandaTableDTO, type OpenTabDTO } from "@/lib/comandaMeta";
import { IconCart, IconReceipt, IconStore, IconUsers } from "@/components/ui/Icons";
import { formatPrice } from "@/components/dashboard/menu/ui";

/**
 * "Lista" is the one kitchen state a server must act on from this screen —
 * food is sitting on the pass. The rest stay quiet so it does not.
 */
const KITCHEN_FLAG: Partial<
  Record<OpenTabDTO["kitchenStatus"], { label: string; className: string }>
> = {
  preparing: {
    label: "En cocina",
    className: "bg-warn/15 text-warn-ink ring-warn/25",
  },
  ready: {
    label: "Lista",
    className: "bg-mint/15 text-mint-ink ring-mint/30",
  },
};

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
  const openTotal = openTabs.reduce((sum, t) => sum + t.total, 0);
  const readyCount = openTabs.filter((t) => t.kitchenStatus === "ready").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[21px] font-bold tracking-[-0.01em] text-fg">
          ¿Para dónde es?
        </h1>
        <p className="mt-0.5 text-[13px] text-faint">
          Toca una mesa para abrir, añadir o cobrar.
        </p>
      </div>

      {/* the floor in one line: what is open, what it adds up to, and whether
          anything is waiting on the pass right now */}
      {openCount > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Cuentas abiertas
            </p>
            <p className="mt-0.5 font-display text-[19px] font-bold tabular-nums text-fg">
              {openCount}
              <span className="ml-2 text-[14px] font-medium text-muted">
                {formatPrice(openTotal)}
              </span>
            </p>
          </div>
          {readyCount > 0 && (
            <span className="ml-auto rounded-lg bg-mint/15 px-2.5 py-1.5 text-[12px] font-semibold text-mint-ink ring-1 ring-inset ring-mint/30">
              {readyCount} {readyCount === 1 ? "lista" : "listas"} en cocina
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ChannelButton
          label="Para llevar"
          hint="Sin mesa"
          icon={<IconCart className="h-[18px] w-[18px]" />}
          onClick={() => onPickOther("pickup")}
        />
        <ChannelButton
          label="Delivery"
          hint="A domicilio"
          icon={<IconStore className="h-[18px] w-[18px]" />}
          onClick={() => onPickOther("delivery")}
        />
      </div>

      {tables.length === 0 ? (
        <p className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-8 text-center text-[13.5px] text-faint">
          Aún no hay mesas. Créalas en el módulo Mesas para tomar comandas de salón.
        </p>
      ) : (
        zones.map(([zone, zoneTables]) => {
          const busy = zoneTables.filter((t) => tabByTable.has(t.id)).length;
          return (
            <div key={zone}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <h2 className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                  {ZONE_LABELS_ES[zone] ?? zone}
                </h2>
                <span className="rounded-full bg-fg/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-faint">
                  {busy}/{zoneTables.length}
                </span>
                <span className="h-px flex-1 bg-fg/[0.06]" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {zoneTables.map((t) => {
                  const tone = TABLE_STATE_TONE[t.state];
                  const tab = tabByTable.get(t.id);
                  const flag = tab ? KITCHEN_FLAG[tab.kitchenStatus] : undefined;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onPickTable(t)}
                      className="relative flex min-h-[108px] flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[0.98]"
                      style={{ borderColor: tone.stroke, backgroundColor: tone.fill }}
                    >
                      {/* the state as a colour band down the edge, readable
                          before any of the text is */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: tone.solid, opacity: 0.75 }}
                      />

                      <div className="flex items-start justify-between gap-2 pl-1.5">
                        <span className="font-display text-[17px] font-bold leading-none text-fg">
                          {t.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-faint">
                          <IconUsers className="h-3 w-3" />
                          {t.capacity}
                        </span>
                      </div>

                      <div className="pl-1.5">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
                          <span style={{ color: tone.text }}>
                            {TABLE_STATE_LABELS[t.state]}
                          </span>
                          {/* the round rides with the state so the money and
                              the kitchen flag keep a line to themselves, even
                              on a four-figure total */}
                          {tab && tab.roundNumber > 1 && (
                            <span className="text-faint">· R{tab.roundNumber}</span>
                          )}
                        </span>

                        {tab && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-fg">
                              <IconReceipt className="h-3 w-3 opacity-70" />
                              {formatPrice(tab.total)}
                            </span>
                            {flag && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${flag.className}`}
                              >
                                {flag.label}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ChannelButton({
  label,
  hint,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-left transition-colors hover:bg-fg/[0.07] active:scale-[0.98]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg/[0.06] text-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-fg/90">{label}</span>
        <span className="block truncate text-[12px] text-faint">{hint}</span>
      </span>
    </button>
  );
}
