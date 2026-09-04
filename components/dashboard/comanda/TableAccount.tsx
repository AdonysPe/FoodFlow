"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { voidOrder } from "@/lib/actions/comanda";
import { formatPrice } from "@/components/dashboard/menu/ui";
import { ZONE_LABELS_ES, type OpenTabDTO, type OpenTabLine } from "@/lib/comandaMeta";

const KITCHEN_LABELS: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "En cola",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida",
};

// The kitchen state is the one thing a server checks at a glance, so it gets
// a colour rather than another grey chip.
const KITCHEN_TONE: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "border-fg/15 bg-fg/[0.06] text-fg/60",
  preparing: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  ready: "border-mint/40 bg-mint/10 text-mint-ink",
  delivered: "border-fg/10 bg-fg/[0.04] text-fg/40",
};

/** Short, sayable ticket number — what a server reads out loud on the phone. */
function ticketNumber(orderId: string) {
  return orderId.slice(-6).toUpperCase();
}

function openedAtLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function TableAccount({
  tab,
  onBack,
  onAddItems,
  onCharge,
  onVoided,
}: {
  tab: OpenTabDTO;
  onBack: () => void;
  onAddItems: () => void;
  onCharge: () => void;
  onVoided: () => void;
}) {
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const rounds = useMemo(() => {
    const map = new Map<number, OpenTabLine[]>();
    for (const l of tab.lines) {
      const r = l.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(l);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [tab.lines]);

  const dishCount = useMemo(
    () => tab.lines.reduce((sum, l) => sum + l.quantity, 0),
    [tab.lines]
  );

  const multi = rounds.length > 1;
  const zone = tab.tableZone ? ZONE_LABELS_ES[tab.tableZone] ?? tab.tableZone : null;
  // The comanda stores the table name as the customer for a dine-in order, so
  // this only prints when someone actually put the account under a name.
  const namedFor =
    tab.customerName && tab.customerName !== tab.tableName ? tab.customerName : null;

  function handleVoid() {
    if (!confirmingVoid) {
      setConfirmingVoid(true);
      return;
    }
    startTransition(async () => {
      const result = await voidOrder(tab.orderId);
      if (result.ok) onVoided();
      else pushToast(result.error, "error");
      setConfirmingVoid(false);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[53px] z-20 border-b border-fg/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-fg">{tab.tableName}</span>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${KITCHEN_TONE[tab.kitchenStatus]}`}
            >
              {KITCHEN_LABELS[tab.kitchenStatus]}
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-fg/45 hover:bg-fg/[0.06] hover:text-fg/80"
          >
            Mesas
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {/* ---------------------------------------------------- the ticket */}
        <article className="overflow-hidden rounded-2xl border border-fg/[0.09] bg-ink-900 shadow-lift">
          {/* header: who and where, plus the number the server reads out */}
          <header className="px-4 pt-4 pb-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-ink">
                  Comanda
                </p>
                <h2 className="mt-1 truncate font-display text-[22px] font-extrabold tracking-[-0.02em] text-fg">
                  {tab.tableName}
                </h2>
                {zone && <p className="text-[12px] text-fg/40">{zone}</p>}
              </div>
              <span className="shrink-0 rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2 py-1 font-mono text-[12px] tracking-wide text-fg/55">
                #{ticketNumber(tab.orderId)}
              </span>
            </div>

            <dl className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <div>
                <dt className="text-fg/35">Abierta</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-fg/75">
                  {openedAtLabel(tab.openedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-fg/35">Mozo</dt>
                <dd className="mt-0.5 truncate font-medium text-fg/75">
                  {tab.serverName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-fg/35">A nombre de</dt>
                <dd className="mt-0.5 truncate font-medium text-fg/75">
                  {namedFor ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-fg/35">Rondas</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-fg/75">
                  {tab.roundNumber}
                </dd>
              </div>
            </dl>
          </header>

          {/* perforation — the fold every paper ticket has */}
          <div className="relative h-4">
            <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-fg/15" />
            <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-950" />
            <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-950" />
          </div>

          {/* lines, grouped by the round they were sent in */}
          <div className="px-4 pb-1 pt-2">
            {rounds.map(([round, lines], roundIndex) => (
              <section key={round} className={roundIndex > 0 ? "mt-4" : ""}>
                {multi && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg/30">
                      Ronda {round}
                    </span>
                    <span className="h-px flex-1 bg-fg/[0.07]" />
                  </div>
                )}

                <ul className="flex flex-col gap-2.5">
                  {lines.map((l, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-px shrink-0 rounded-md border border-fg/[0.1] bg-fg/[0.05] px-1.5 py-0.5 font-mono text-[12px] font-semibold tabular-nums text-fg/80">
                        {l.quantity}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] leading-snug text-fg/85">
                          {l.name}
                        </span>
                        {/* unit price, so a corrected line can be checked */}
                        <span className="mt-0.5 block text-[11.5px] tabular-nums text-fg/35">
                          {formatPrice(l.price)} c/u
                        </span>
                        {l.note && (
                          <span className="mt-1 inline-block rounded-md bg-accent-400/10 px-1.5 py-0.5 text-[11.5px] text-accent-label">
                            {l.note}
                          </span>
                        )}
                      </span>

                      <span className="shrink-0 pt-px font-mono text-[13px] tabular-nums text-fg/70">
                        {formatPrice(l.price * l.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* totals */}
          <footer className="mt-4 border-t border-dashed border-fg/15 px-4 py-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-fg/70">
                Total
                <span className="ml-2 font-normal normal-case tracking-normal text-fg/35">
                  {dishCount} {dishCount === 1 ? "plato" : "platos"}
                </span>
              </span>
              <span className="font-display text-[24px] font-extrabold tabular-nums tracking-[-0.02em] text-fg">
                {formatPrice(tab.total)}
              </span>
            </div>
          </footer>
        </article>

        {/* Precuenta: the same paper, printed before anyone pays, for the
            table that asks to check the bill first. It has no number and no
            payment on it, and says so. */}
        <Link
          href={`/dashboard/boleta/${tab.orderId}`}
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-fg/[0.12] bg-fg/[0.04] px-4 py-2.5 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.07] hover:text-fg"
        >
          Imprimir precuenta
        </Link>

        <button
          type="button"
          onClick={handleVoid}
          onBlur={() => setConfirmingVoid(false)}
          disabled={isPending}
          className={`mt-2 w-full rounded-xl px-4 py-2.5 text-[12.5px] font-medium transition-colors disabled:opacity-40 ${
            confirmingVoid
              ? "bg-accent-500 text-fg hover:bg-accent-600"
              : "border border-fg/[0.1] bg-fg/[0.03] text-fg/45 hover:text-fg/70"
          }`}
        >
          {confirmingVoid ? "¿Anular la cuenta y liberar la mesa?" : "Anular cuenta"}
        </button>
      </div>

      <div className="sticky bottom-0 z-30 flex gap-2 border-t border-fg/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onAddItems}
          className="h-12 flex-1 rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[14px] font-semibold text-fg/80 active:scale-[0.98]"
        >
          + Añadir platos
        </button>
        <button
          type="button"
          onClick={onCharge}
          className="h-12 flex-1 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[14px] font-bold text-on-accent active:scale-[0.98]"
        >
          Cobrar {formatPrice(tab.total)}
        </button>
      </div>
    </div>
  );
}
