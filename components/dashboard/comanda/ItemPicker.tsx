"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { EASE } from "@/lib/motion";
import { formatPrice } from "@/components/dashboard/menu/ui";
import { NOTE_CHIPS, type ComandaCategoryDTO, type ComandaItemDTO, type FrequentItemDTO } from "@/lib/comandaMeta";
import type { Cart } from "./ComandaFlow";

const OTHERS = "__others__";

/** Lower-case and strip accents so "ceviche" finds "Cévíche". */
function norm(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function Stepper({ qty, name, onChange }: { qty: number; name: string; onChange: (n: number) => void }) {
  return (
    <div className={`lbd-cm-step${qty > 0 ? " is-on" : ""}`}>
      {qty > 0 && (
        <>
          <button type="button" onClick={() => onChange(qty - 1)} aria-label={`Quitar uno de ${name}`}>
            −
          </button>
          <span className="lbd-mono">{qty}</span>
        </>
      )}
      <button type="button" onClick={() => onChange(qty + 1)} aria-label={`Agregar ${name}`} className="is-plus">
        +
      </button>
    </div>
  );
}

function LineNote({ note, onChange }: { note: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(note.trim().length > 0);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="lbd-cm-addnote">
        + Nota para cocina
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <input autoFocus value={note} onChange={(e) => onChange(e.target.value)} placeholder="Nota para cocina…" aria-label="Nota para cocina" className="lbd-input" style={{ height: 42, fontSize: 14 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {NOTE_CHIPS.map((chip) => {
          const active = note.toLowerCase().includes(chip);
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const parts = note.split(",").map((p) => p.trim()).filter(Boolean);
                if (active) onChange(parts.filter((p) => p.toLowerCase() !== chip).join(", "));
                else onChange([...parts, chip].join(", "));
              }}
              className={`lbd-cm-notechip${active ? " is-on" : ""}`}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Step two of the comanda, design B: the carta as a list a thumb can work.
 * Search and category tabs on top, a photo and a pill stepper on every dish,
 * and the kitchen note one tap away once a dish is picked.
 */
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
  const [query, setQuery] = useState("");

  const needle = norm(query.trim());
  const shown = useMemo(() => {
    if (needle) return items.filter((i) => norm(i.name).includes(needle));
    if (activeTab === OTHERS) return items.filter((i) => i.categoryId == null);
    return items.filter((i) => i.categoryId === activeTab);
  }, [items, activeTab, needle]);

  // How many dishes are already picked in each tab, so nothing chosen two
  // categories ago is forgotten behind a tab the server is not looking at.
  const pickedPerTab = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const map = new Map<string, number>();
    for (const [id, line] of Object.entries(cart)) {
      const item = byId.get(id);
      if (!item) continue;
      const key = item.categoryId ?? OTHERS;
      map.set(key, (map.get(key) ?? 0) + line.qty);
    }
    return map;
  }, [cart, items]);

  const roundLabel = roundNumber > 1 ? `Ronda ${roundNumber}` : null;

  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
      <div className="lbd-cm-sticky">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: "#a39b90" }}>{roundLabel ? `${roundLabel} · nueva` : "Nuevo pedido"}</span>
            <h1 className="lbd-display lbd-cm-h1 lbd-trunc">{targetLabel}</h1>
          </div>
          <button type="button" onClick={onBack} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ flexShrink: 0 }}>
            Cambiar
          </button>
        </div>

        <div className="lbd-cm-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en la carta" aria-label="Buscar plato" />
        </div>

        {frequent.length > 0 && !needle && (
          <div className="lbd-cm-scroll">
            <div style={{ display: "flex", width: "max-content", alignItems: "center", gap: 8 }}>
              <span className="lbd-cm-eyebrow" style={{ flexShrink: 0 }}>
                Frecuentes
              </span>
              {frequent.map((f) => {
                const qty = cart[f.id]?.qty ?? 0;
                return (
                  <button key={f.id} type="button" onClick={() => onSetQty(f.id, qty + 1)} className={`lbd-cm-pill${qty > 0 ? " is-accent" : ""}`}>
                    {f.name}
                    {qty > 0 && <b className="lbd-mono">{qty}</b>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="lbd-cm-scroll" role="tablist" aria-label="Categorías">
          <div style={{ display: "flex", width: "max-content", gap: 6 }}>
            {tabs.map((t) => {
              const active = !needle && t.id === activeTab;
              const picked = pickedPerTab.get(t.id) ?? 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setQuery("");
                    setActiveTab(t.id);
                  }}
                  className={`lbd-cm-tab${active ? " is-on" : ""}`}
                >
                  {t.name}
                  {picked > 0 && <b>{picked}</b>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "4px 16px 220px" }}>
        {shown.length === 0 ? (
          <p className="lbd-ov-empty" style={{ padding: "32px 0", textAlign: "center", fontSize: 14 }}>
            {needle ? "No hay platos con ese nombre." : "No hay platos disponibles en esta categoría."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {shown.map((item) => {
              const line = cart[item.id];
              const qty = line?.qty ?? 0;
              const picked = qty > 0;

              return (
                <li key={item.id} className={`lbd-cm-item${picked ? " is-picked" : ""}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* the whole row adds one, so a busy server never has to
                        aim for the small button */}
                    <button type="button" onClick={() => onSetQty(item.id, qty + 1)} className="lbd-cm-item-main" aria-label={`Agregar ${item.name}`}>
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt="" className="lbd-cm-photo" loading="lazy" />
                      ) : (
                        <span className="lbd-cm-photo lbd-cm-photo--blank" aria-hidden>
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{item.name}</span>
                        <span style={{ fontSize: 13, color: "#a39b90", display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                          <span>{formatPrice(item.price)}</span>
                          {item.prepMin != null && <span>· {item.prepMin} min</span>}
                          {picked && <span style={{ color: "#ff7a57", fontWeight: 600 }}>= {formatPrice(item.price * qty)}</span>}
                        </span>
                      </span>
                    </button>
                    <Stepper qty={qty} name={item.name} onChange={(n) => onSetQty(item.id, n)} />
                  </div>

                  <AnimatePresence initial={false}>
                    {picked && (
                      <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: EASE }} style={{ overflow: "hidden", paddingLeft: 64 }}>
                        <LineNote note={line?.note ?? ""} onChange={(v) => onSetNote(item.id, v)} />
                      </m.div>
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
