"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { formatPrice } from "@/components/dashboard/menu/ui";
import { NOTE_CHIPS, type ComandaCategoryDTO, type ComandaItemDTO, type FrequentItemDTO } from "@/lib/comandaMeta";
import type { Cart } from "./ComandaFlow";

const OTHERS = "__others__";

function Stepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (n: number) => void;
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        className="h-10 shrink-0 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 text-[15px] font-bold text-white/80 transition-colors active:scale-95"
        aria-label="Agregar"
      >
        +
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-[17px] font-bold text-white/70 active:scale-95"
        aria-label="Quitar uno"
      >
        −
      </button>
      <span className="w-6 text-center text-[15px] font-bold tabular-nums text-white">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/40 bg-accent-400/15 text-[17px] font-bold text-accent-200 active:scale-95"
        aria-label="Agregar uno"
      >
        +
      </button>
    </div>
  );
}

function LineNote({ note, onChange }: { note: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(note.trim().length > 0);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 text-[12px] font-medium text-accent-300/80 hover:text-accent-300"
      >
        + Agregar nota
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        autoFocus
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nota para cocina…"
        className="h-9 w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-accent-400/50"
      />
      <div className="flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((chip) => {
          const active = note.toLowerCase().includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => {
                const parts = note.split(",").map((p) => p.trim()).filter(Boolean);
                if (active) onChange(parts.filter((p) => p.toLowerCase() !== chip).join(", "));
                else onChange([...parts, chip].join(", "));
              }}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                active
                  ? "bg-accent-400/20 text-accent-200"
                  : "border border-white/[0.1] bg-white/[0.03] text-white/50 hover:text-white/80"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ItemPicker({
  targetLabel,
  roundNumber,
  categories,
  items,
  frequent,
  cart,
  onBack,
  onSetQty,
  onSetNote,
}: {
  targetLabel: string;
  roundNumber: number;
  categories: ComandaCategoryDTO[];
  items: ComandaItemDTO[];
  frequent: FrequentItemDTO[];
  cart: Cart;
  onBack: () => void;
  onSetQty: (itemId: string, qty: number) => void;
  onSetNote: (itemId: string, note: string) => void;
}) {
  const hasOrphans = items.some((i) => i.categoryId == null);
  const tabs = useMemo(() => {
    const list = categories.map((c) => ({ id: c.id, name: c.name }));
    if (hasOrphans) list.push({ id: OTHERS, name: "Otros" });
    return list;
  }, [categories, hasOrphans]);

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? OTHERS);

  const shown = useMemo(() => {
    if (activeTab === OTHERS) return items.filter((i) => i.categoryId == null);
    return items.filter((i) => i.categoryId === activeTab);
  }, [items, activeTab]);

  const roundLabel = roundNumber > 1 ? `Ronda ${roundNumber}` : null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[53px] z-20 border-b border-white/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-white">{targetLabel}</span>
            {roundLabel && (
              <span className="rounded-md bg-accent-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-200">
                {roundLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-white/45 hover:bg-white/[0.06] hover:text-white/80"
          >
            Cambiar
          </button>
        </div>

        {frequent.length > 0 && (
          <div className="-mx-4 mt-3 overflow-x-auto px-4">
            <div className="flex w-max gap-2">
              <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-white/30">
                Frecuentes
              </span>
              {frequent.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSetQty(f.id, (cart[f.id]?.qty ?? 0) + 1)}
                  className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/80 active:scale-95"
                >
                  {f.name}
                  {cart[f.id]?.qty ? ` · ${cart[f.id].qty}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="-mx-4 mt-3 overflow-x-auto px-4">
          <div className="flex w-max gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {tabs.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`relative shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active ? "text-white" : "text-white/45"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="comanda-tab"
                      transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                      className="absolute inset-0 rounded-lg bg-white/[0.1]"
                    />
                  )}
                  <span className="relative">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-white/40">
            No hay platos disponibles en esta categoría.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((item) => {
              const line = cart[item.id];
              const qty = line?.qty ?? 0;
              return (
                <li
                  key={item.id}
                  className={`rounded-2xl border p-3 transition-colors ${
                    qty > 0
                      ? "border-accent-400/30 bg-accent-400/[0.06]"
                      : "border-white/[0.07] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSetQty(item.id, qty + 1)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-[14.5px] font-medium text-white/90">{item.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-white/45">
                        {formatPrice(item.price)}
                        {item.prepMin != null ? ` · ${item.prepMin} min` : ""}
                      </p>
                    </button>
                    <Stepper qty={qty} onChange={(n) => onSetQty(item.id, n)} />
                  </div>

                  <AnimatePresence initial={false}>
                    {qty > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <LineNote
                          note={line?.note ?? ""}
                          onChange={(v) => onSetNote(item.id, v)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
