"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { submitTableOrder } from "@/lib/actions/publicOrder";
import { NOTE_CHIPS, ZONE_LABELS_ES } from "@/lib/comandaMeta";
import { formatCurrency } from "@/lib/format";

const OTHERS = "__otros__";

const KITCHEN_LABELS = {
  pending: "En cola",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida",
};

const ERRORS = {
  invalid: "Revisa tu pedido y vuelve a intentar.",
  unknown_table: "Este código de mesa ya no es válido. Llama a un mozo.",
  closed: "Esta mesa no está disponible. Llama a un mozo.",
  unavailable: "Uno de los platos se acaba de agotar. Quítalo y envía de nuevo.",
  rate_limited:
    "Ya enviaste varias rondas desde esta mesa. Llama a un mozo para seguir pidiendo.",
  server: "No pudimos enviar tu pedido. Llama a un mozo, por favor.",
};

/**
 * What a diner sees after scanning the QR taped to their table.
 *
 * The table comes from the code in the URL, so there is nothing to choose and
 * nothing to log into: they land on the carta with their own bill already on
 * screen. Sending puts the round in the same queue a waiter's round goes to.
 */
export default function TableOrderFlow({
  code,
  table,
  restaurantName,
  categories,
  items,
  openTab,
}) {
  const [cart, setCart] = useState({});
  const [noteFor, setNoteFor] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [isPending, startTransition] = useTransition();

  const tabs = useMemo(() => {
    const list = categories.map((c) => ({ id: c.id, name: c.name }));
    if (items.some((i) => i.categoryId == null)) list.push({ id: OTHERS, name: "Otros" });
    return list;
  }, [categories, items]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? OTHERS);

  const shown = useMemo(
    () =>
      activeTab === OTHERS
        ? items.filter((i) => i.categoryId == null)
        : items.filter((i) => i.categoryId === activeTab),
    [items, activeTab]
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const { count, total } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const [id, line] of Object.entries(cart)) {
      const item = itemById.get(id);
      if (!item) continue;
      c += line.qty;
      t += line.qty * item.price;
    }
    return { count: c, total: t };
  }, [cart, itemById]);

  // Selected dishes per tab, so nothing chosen two categories back is lost
  // behind a tab nobody is looking at.
  const pickedPerTab = useMemo(() => {
    const map = new Map();
    for (const [id, line] of Object.entries(cart)) {
      const item = itemById.get(id);
      if (!item) continue;
      const key = item.categoryId ?? OTHERS;
      map.set(key, (map.get(key) ?? 0) + line.qty);
    }
    return map;
  }, [cart, itemById]);

  const previousRounds = useMemo(() => {
    if (!openTab) return [];
    const map = new Map();
    for (const line of openTab.lines) {
      const r = line.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(line);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [openTab]);

  function setQty(id, qty) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = { qty, note: prev[id]?.note ?? "" };
      return next;
    });
  }

  function setNote(id, note) {
    setCart((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], note } } : prev));
  }

  function send() {
    if (count === 0) return;
    setError("");
    const lines = Object.entries(cart).map(([menuItemId, line]) => ({
      menuItemId,
      quantity: line.qty,
      note: line.note.trim() || undefined,
    }));

    startTransition(async () => {
      const result = await submitTableOrder({ code, lines, customerName });
      if (!result.ok) {
        setError(
          result.detail
            ? `"${result.detail}" ya no está disponible. Quítalo y envía de nuevo.`
            : (ERRORS[result.code] ?? ERRORS.server)
        );
        return;
      }
      setSent({ round: result.round, total: result.total });
      setCart({});
    });
  }

  if (sent) {
    return (
      <Sent
        sent={sent}
        table={table}
        onAgain={() => {
          setSent(null);
          setActiveTab(tabs[0]?.id ?? OTHERS);
        }}
      />
    );
  }

  const zone = table.zone ? (ZONE_LABELS_ES[table.zone] ?? table.zone) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-20 border-b border-fg/[0.07] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
              {restaurantName}
            </p>
            <h1 className="mt-0.5 font-display text-[21px] font-extrabold tracking-[-0.02em] text-fg">
              {table.name}
            </h1>
          </div>
          {zone && <span className="shrink-0 text-[12px] text-fg/40">{zone}</span>}
        </div>
      </header>

      <div className="flex-1 px-4 pb-40 pt-4">
        {/* ----------------------------------------------------- tu cuenta */}
        {openTab && (
          <section className="mb-5 rounded-2xl border border-fg/[0.09] bg-fg/[0.03] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg/40">
                Lo que ya pediste
              </h2>
              <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[10.5px] text-fg/50">
                {KITCHEN_LABELS[openTab.status] ?? openTab.status}
              </span>
            </div>

            {previousRounds.map(([round, lines]) => (
              <div key={round} className="mt-3">
                {previousRounds.length > 1 && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fg/25">
                    Ronda {round}
                  </p>
                )}
                <ul className="flex flex-col gap-1">
                  {lines.map((line, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[13.5px]">
                      <span className="font-mono text-[12px] tabular-nums text-fg/50">
                        {line.quantity}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-fg/75">{line.name}</span>
                      <span className="shrink-0 tabular-nums text-fg/55">
                        {formatCurrency(line.price * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <p className="mt-3 flex items-baseline justify-between border-t border-fg/[0.08] pt-3">
              <span className="text-[13px] font-semibold text-fg/70">Total hasta ahora</span>
              <span className="font-display text-[19px] font-bold tabular-nums text-fg">
                {formatCurrency(openTab.total)}
              </span>
            </p>
          </section>
        )}

        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg/40">
          {openTab ? "Pedir otra ronda" : "La carta"}
        </h2>

        {/* -------------------------------------------------------- categorías */}
        <div className="-mx-4 mt-2.5 overflow-x-auto px-4">
          <div className="flex w-max gap-1 rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-1">
            {tabs.map((t) => {
              const active = t.id === activeTab;
              const picked = pickedPerTab.get(t.id) ?? 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active ? "bg-fg/[0.1] text-fg" : "text-fg/45"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {t.name}
                    {picked > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-400 px-1 text-[10px] font-bold tabular-nums text-on-accent">
                        {picked}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------ platos */}
        <ul className="mt-3 flex flex-col gap-2">
          {shown.length === 0 && (
            <li className="py-10 text-center text-[13.5px] text-fg/35">
              No hay platos en esta categoría.
            </li>
          )}

          {shown.map((item) => {
            const line = cart[item.id];
            const qty = line?.qty ?? 0;
            const picked = qty > 0;

            return (
              <li
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border p-3 transition-colors ${
                  picked
                    ? "border-accent-400/35 bg-accent-400/[0.07]"
                    : "border-fg/[0.07] bg-fg/[0.02]"
                }`}
              >
                {picked && (
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent-icon" />
                )}

                <div className={`flex items-start justify-between gap-3 ${picked ? "pl-2" : ""}`}>
                  {/* Same 4:3 thumbnail as the public carta. A diner who read
                      the menu on the wall and then scanned the table should be
                      looking at the same dish, not a plainer list of names. */}
                  {item.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setQty(item.id, qty + 1)}
                      aria-label={`Añadir ${item.name}`}
                      className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-fg/[0.08] bg-fg/[0.04] active:scale-[0.97]"
                    >
                      <Image
                        src={item.photoUrl}
                        alt=""
                        fill
                        sizes="68px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setQty(item.id, qty + 1)}
                    className="min-w-0 flex-1 py-0.5 text-left"
                  >
                    <p className="text-[15px] font-medium leading-snug text-fg">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-fg/45">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px]">
                      <span className="font-semibold tabular-nums text-fg/70">
                        {formatCurrency(item.price)}
                      </span>
                      {item.prepMin != null && (
                        <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[11px] text-fg/45">
                          {item.prepMin} min
                        </span>
                      )}
                      {picked && (
                        <span className="font-semibold tabular-nums text-accent-ink">
                          = {formatCurrency(item.price * qty)}
                        </span>
                      )}
                    </p>
                  </button>

                  <Stepper qty={qty} onChange={(n) => setQty(item.id, n)} />
                </div>

                {picked && (
                  <div className="mt-2 pl-2">
                    {noteFor === item.id || (line?.note ?? "").length > 0 ? (
                      <>
                        <input
                          value={line?.note ?? ""}
                          onChange={(e) => setNote(item.id, e.target.value)}
                          placeholder="Nota para cocina…"
                          maxLength={140}
                          className="h-10 w-full rounded-lg border border-fg/[0.12] bg-ink-950/60 px-3 text-[13.5px] text-fg placeholder:text-fg/30 outline-none focus:border-accent-400/50"
                        />
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {NOTE_CHIPS.map((chip) => {
                            const on = (line?.note ?? "").toLowerCase().includes(chip);
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  const parts = (line?.note ?? "")
                                    .split(",")
                                    .map((p) => p.trim())
                                    .filter(Boolean);
                                  setNote(
                                    item.id,
                                    on
                                      ? parts.filter((p) => p.toLowerCase() !== chip).join(", ")
                                      : [...parts, chip].join(", ")
                                  );
                                }}
                                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                                  on
                                    ? "bg-accent-400/20 text-accent-label ring-1 ring-inset ring-accent-400/30"
                                    : "border border-fg/[0.1] bg-fg/[0.03] text-fg/50"
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNoteFor(item.id)}
                        className="rounded-lg border border-dashed border-fg/[0.14] px-2.5 py-1 text-[12px] font-medium text-fg/45"
                      >
                        + Nota para cocina
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ------------------------------------------------------------- enviar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-fg/[0.08] bg-ink-950/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3">
          {/* Only on the first round: after that the bill already has a name. */}
          {!openTab && count > 0 && (
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={60}
              placeholder="¿A nombre de quién? (opcional)"
              className="mb-2.5 h-10 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-3.5 text-[13.5px] text-fg placeholder:text-fg/30 outline-none focus:border-accent-400/50"
            />
          )}

          {error && (
            <p
              role="alert"
              className="mb-2.5 rounded-xl border border-accent-400/30 bg-accent-400/[0.07] px-3 py-2.5 text-[12.5px] leading-relaxed text-accent-label"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-fg/85">
                {count === 0 ? "Sin platos" : `${count} ${count === 1 ? "plato" : "platos"}`}
              </p>
              <p className="text-[12px] tabular-nums text-fg/45">{formatCurrency(total)}</p>
            </div>
            <button
              type="button"
              disabled={count === 0 || isPending}
              onClick={send}
              className="h-12 shrink-0 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-6 text-[14px] font-bold text-on-accent transition-opacity active:scale-[0.98] disabled:opacity-40"
            >
              {isPending ? "Enviando…" : openTab ? "Enviar ronda" : "Enviar a cocina"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ qty, onChange }) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label="Agregar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[19px] font-bold text-fg/70 active:scale-95"
      >
        +
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-accent-400/30 bg-accent-400/[0.08] p-1">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        aria-label="Quitar uno"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[19px] font-bold text-fg/60 active:scale-95"
      >
        −
      </button>
      <span className="w-6 text-center font-display text-[16px] font-bold tabular-nums text-fg">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        aria-label="Agregar uno"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400/20 text-[19px] font-bold text-accent-label active:scale-95"
      >
        +
      </button>
    </div>
  );
}

function Sent({ sent, table, onAgain }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint/12 text-[26px] ring-1 ring-inset ring-mint/30">
        <span aria-hidden>✓</span>
      </span>

      <h1 className="mt-6 font-display text-[26px] font-extrabold leading-snug tracking-[-0.02em] text-fg">
        Tu pedido llegó a cocina
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-fg/60">
        {sent.round > 1 ? `Ronda ${sent.round} de ` : ""}
        {table.name}. Tu cuenta va en{" "}
        <span className="font-semibold text-fg">{formatCurrency(sent.total)}</span>.
      </p>
      <p className="mt-2 text-[13.5px] text-fg/40">
        Un mozo te lo confirma en un momento. Si necesitas algo, llámalo con la mano —
        siempre hay alguien.
      </p>

      <button
        type="button"
        onClick={onAgain}
        className="mt-8 h-12 rounded-xl border border-fg/[0.12] bg-fg/[0.05] px-6 text-[14px] font-semibold text-fg/85 active:scale-[0.98]"
      >
        Pedir otra ronda
      </button>
    </div>
  );
}
