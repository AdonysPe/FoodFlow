"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { submitTableOrder, submitOnlineOrder } from "@/lib/actions/publicOrder";
import OnlineCheckout from "./OnlineCheckout";
import { orderingAvailability, peruWallTime } from "@/lib/orderingWebsite";
import { NOTE_CHIPS, ZONE_LABELS_ES } from "@/lib/comandaMeta";
import { formatCurrency } from "@/lib/format";
import { isOpenAt, todayLabel } from "@/lib/carta";
import { lbFontClasses } from "@/components/landing/lbFonts";
import styles from "./TableOrderExperience.module.css";

/**
 * The diner's carta and order, design B ("Noche"), as drawn in the prototype:
 * a hero with the dish of the moment, category pills, a list with a + on every
 * row, a glass bar with the count and the total, and — once the order is sent
 * from a table — the progress ring that follows it through the kitchen.
 *
 * One component for both entrances: the table QR (/m/[code]) and the ordering
 * website (`remote`, /pedido/[slug]). The look is the same for every venue.
 */

const OTHERS = "__otros__";
const POLL_MS = 8_000;
const SUGGESTIONS = [...new Set([...NOTE_CHIPS, "poco picante", "sin cubiertos"])];
const ERRORS = {
  invalid: "Revisa tu pedido y vuelve a intentar.",
  unknown_table: "Este código de mesa ya no es válido. Llama a un mozo.",
  closed: "Esta mesa no está disponible. Llama a un mozo.",
  unavailable: "Uno de los platos se acaba de agotar. Quítalo y envía de nuevo.",
  rate_limited: "Ya enviaste varias rondas desde esta mesa. Llama a un mozo para seguir pidiendo.",
  server: "No pudimos enviar tu pedido. Inténtalo de nuevo o llama a un mozo.",
};

// Circumference of the progress ring (r = 120).
const RING = 754;

function initialsFor(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function itemLabel(item) {
  const detail = `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("es-PE");
  return /picante|rocoto/.test(detail) ? "Picante" : null;
}

function useTableState(code, initial, remote, preview) {
  const [state, setState] = useState(initial);
  const [online, setOnline] = useState(true);
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    if (preview) return;
    const request = ++latestRequest.current;
    try {
      const response = await fetch(remote ? `/api/pedido/${code}` : `/api/m/${code}/state`, { cache: "no-store" });
      if (!response.ok) {
        if (remote && response.status === 404) setState(previous => ({ ...previous, ordering: { ...previous.ordering, active: false } }));
        throw new Error("state unavailable");
      }
      const next = await response.json();
      if (request !== latestRequest.current) return;
      setState(next);
      setOnline(true);
    } catch { if (request === latestRequest.current) setOnline(false); }
  }, [code, remote, preview]);
  useEffect(() => {
    if (preview) return;
    const updateWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(updateWhenVisible, POLL_MS);
    document.addEventListener("visibilitychange", updateWhenVisible);
    window.addEventListener("focus", updateWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateWhenVisible);
      window.removeEventListener("focus", updateWhenVisible);
    };
  }, [refresh, preview]);
  return { state, online, refresh };
}

function Quantity({ value, onChange, compact = false, min = 0 }) {
  return <div className={`${styles.quantity} ${compact ? styles.quantityCompact : ""}`} aria-label="Cantidad">
    <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Quitar uno">−</button>
    <span aria-live="polite">{value}</span>
    <button type="button" disabled={value >= 20} onClick={() => onChange(value + 1)} aria-label="Agregar uno">+</button>
  </div>;
}

function NoteChips({ note, setNote, suggestions }) {
  const parts = note.split(",").map((part) => part.trim()).filter(Boolean);
  return <div className={styles.noteChips}>{suggestions.map((chip) => {
    const selected = parts.some((part) => part.toLowerCase() === chip);
    return <button type="button" key={chip} aria-pressed={selected} onClick={() => setNote(selected ? parts.filter((part) => part.toLowerCase() !== chip).join(", ") : [...parts, chip].join(", "))}>{chip}</button>;
  })}</div>;
}

function ProductDetail({ item, qty, note, setQty, setNote, onAdd, onClose, dialogRef, suggestions }) {
  return <>
    <div className={styles.detailBackdrop} onClick={onClose} aria-hidden="true" />
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="detail-title" className={styles.detailDialog}>
      <button type="button" className={styles.detailClose} onClick={onClose} aria-label="Cerrar detalle">×</button>
      {item.photoUrl && <div className={styles.detailPhoto}>
        <Image src={item.photoUrl} alt={item.name} fill sizes="(min-width: 700px) 560px, 100vw" className={styles.foodPhoto} />
      </div>}
      <div className={styles.detailBody} style={item.photoUrl ? undefined : { paddingTop: 64 }}>
        <h2 id="detail-title">{item.name}</h2>
        {item.description && <p>{item.description}</p>}
        <div className={styles.detailMeta}><strong>{formatCurrency(item.price)}</strong><span>{item.available ? "Disponible" : "Agotado por hoy"}</span></div>
        <div className={styles.detailQuantity}><span>Cantidad</span><Quantity value={qty} min={1} onChange={setQty} /></div>
        <label className={styles.noteLabel} htmlFor="detail-note">Indicaciones especiales</label>
        <input id="detail-note" className={styles.noteInput} maxLength={140} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej. sin cebolla" />
        <NoteChips note={note} setNote={setNote} suggestions={suggestions} />
        <button type="button" className={styles.sendButton} disabled={!item.available} onClick={onAdd}>{item.available ? "Agregar al pedido" : "Agotado"}</button>
      </div>
    </section>
  </>;
}

function PreviousOrder({ openTab }) {
  if (!openTab) return null;
  const status = { pending: "Pedido recibido", preparing: "En cocina", ready: "Listo para servir", delivered: "Servido" }[openTab.status] ?? "En cocina";
  return <section className={styles.previous} aria-label="Pedido anterior de la mesa">
    <div className={styles.previousTop}><h2>Ya pedido en esta mesa</h2><span>{status}</span></div>
    <ul>{openTab.lines.map((line, index) => <li key={index}><span>{line.quantity} × {line.name}</span><span>{formatCurrency(line.price * line.quantity)}</span></li>)}</ul>
    <p className={styles.previousTotal}><span>Total de la mesa</span><strong>{formatCurrency(openTab.total)}</strong></p>
  </section>;
}

function CartContent({ cart, itemById, count, total, openTab, customerName, setCustomerName, setQty, setNote, error, isPending, send, onClose, mobile, suggestions, tableName, checkout }) {
  const lines = Object.entries(cart).map(([id, line]) => ({ item: itemById.get(id), ...line })).filter(({ item }) => item);
  const hasUnavailable = lines.some(({ item }) => !item.available);
  return <div className={styles.cartContent}>
    <div className={styles.cartHeading}>
      <h2 id={mobile ? "mobile-cart-title" : "desktop-cart-title"}>Mi pedido</h2>
      {mobile && <button type="button" className={styles.closeCart} onClick={onClose} aria-label="Cerrar pedido">×</button>}
    </div>
    {lines.length === 0 ? <p className={styles.emptyCart}>Aún no agregaste platos. Toca + en la carta para armar tu pedido.</p> : <ul className={styles.cartLines}>
      {lines.map(({ item, qty, note }) => <li key={item.id} className={styles.cartLine}>
        <div className={styles.cartLineTop}>
          <div><h3>{item.name}</h3><span>{formatCurrency(item.price * qty)}</span></div>
          <Quantity compact value={qty} onChange={(next) => setQty(item.id, next)} />
        </div>
        {!item.available && <p className={styles.cartUnavailable}>Agotado · quítalo para enviar el pedido</p>}
        <label className={styles.noteLabel} htmlFor={`note-${mobile ? "mobile" : "desktop"}-${item.id}`}>Indicaciones para cocina</label>
        <input id={`note-${mobile ? "mobile" : "desktop"}-${item.id}`} value={note} onChange={(event) => setNote(item.id, event.target.value)} maxLength={140} placeholder="Ej. sin cebolla" className={styles.noteInput} />
        <NoteChips note={note} setNote={(next) => setNote(item.id, next)} suggestions={suggestions} />
      </li>)}
    </ul>}
    <div className={styles.cartBottom}>
      {checkout ? <OnlineCheckout {...checkout} subtotal={total} count={count} isPending={isPending || hasUnavailable} error={error} send={send} mobile={mobile} /> : <>
      <p className={styles.cartTable}>{tableName} · Pedido desde QR</p>
      {!openTab && count > 0 && <label className={styles.nameLabel}>Nombre para la cuenta <span>(opcional)</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={60} placeholder="¿A nombre de quién?" /></label>}
      <p className={styles.totalRow}><span>Subtotal</span><strong>{formatCurrency(total)}</strong></p>
      <p className={styles.totalRowMain}><span>Total</span><strong>{formatCurrency(total)}</strong></p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.sendButton} disabled={count === 0 || hasUnavailable || isPending} onClick={send}>{isPending ? "Enviando…" : "Enviar a cocina"}</button>
      <p className={styles.sendHint}>Tu pedido será enviado directamente a cocina.</p>
      </>}
    </div>
  </div>;
}

const STAGES = [
  { title: "Recibido", sub: "Tu pedido llegó a cocina" },
  { title: "En cocina", sub: "Lo estamos preparando" },
  { title: "Listo", sub: "El mozo va en camino" },
  { title: "¡Buen provecho!", sub: "Servido en la mesa" },
];

/** What the diner sees right after sending from the table: the order and where it is. */
function Sent({ sent, table, status, onAgain }) {
  const step = status === "delivered" ? 4 : status === "ready" ? 3 : status === "preparing" ? 2 : 1;
  const stage = STAGES[step - 1];
  return <div data-theme="dark" className={`${lbFontClasses} lb lb-st`} style={{ paddingTop: 0 }}>
    <div className="lb-st-page">
      <div className="lb-st-glow" aria-hidden="true" />
      <header className="lb-st-top">
        <button type="button" className="lb-st-back" onClick={onAgain} style={{ background: "none", border: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Carta
        </button>
        <span className="lb-mono lb-st-code">{table.name.toUpperCase()}{sent.round > 1 ? ` · RONDA ${sent.round}` : ""}</span>
      </header>
      <h1 className="lb-st-venue" style={{ fontWeight: 400 }}>¡Pedido enviado!</h1>
      <div className="lb-st-ring" role="status" aria-live="polite">
        <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true">
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(243,239,230,0.08)" strokeWidth="10" />
          <circle className="lb-st-arc" cx="140" cy="140" r="120" fill="none" stroke="#ff5a33" strokeWidth="10" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={Math.round(RING * (1 - step / 4))} transform="rotate(-90 140 140)" />
        </svg>
        {step < 4 && <div className="lb-st-orbit" aria-hidden="true"><span /></div>}
        <div className="lb-st-center lb-swap" key={step}>
          <span className="lb-mono lb-st-step">{step} DE 4</span>
          <span className="lb-display lb-st-title">{stage.title}</span>
          <span className="lb-st-sub">{step === 4 ? `Servido en ${table.name}` : stage.sub}</span>
        </div>
      </div>
      <ol className="lb-st-steps" aria-label="Avance del pedido">
        {["Recibido", "Cocina", "Listo", "En tu mesa"].map((label, index) => <li key={label} data-on={index < step}><span aria-hidden="true" /><small>{label}</small></li>)}
      </ol>
      <section className="lb-st-card" aria-label="Tu pedido">
        {sent.lines.map((line, index) => <div key={index} className="lb-st-line">
          <span>{line.qty} × {line.name}{line.note && <small>{line.note}</small>}</span>
          <span>{formatCurrency(line.price * line.qty)}</span>
        </div>)}
        <div className="lb-st-rule" />
        <div className="lb-st-line is-total"><span>Total de la mesa</span><span>{formatCurrency(sent.total)}</span></div>
      </section>
      <p className="lb-st-hint">Tu pedido viajó a la pantalla de cocina. Aquí ves cómo avanza.</p>
      <div className="lb-st-actions">
        <button type="button" className="lb-st-btn lb-st-btn--ghost" onClick={onAgain}>Volver a la carta</button>
      </div>
    </div>
  </div>;
}

export default function TableOrderExperience({ code, initial, template = undefined, remote = false, preview = false, previewViewport = "desktop" }) {
  void template;
  const { state, online, refresh } = useTableState(code, initial, remote, preview);
  const { table, restaurantName, categories, items, openTab } = state;
  const venue = state.venue ?? {};
  const [cart, setCart] = useState({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const submitting = useRef(false);
  const attemptRef = useRef(null);
  // `district`, `placeId` and `locationConfirmed` only steer the address step;
  // the server reads the zone, never the district the browser detected.
  const [checkoutValue, setCheckoutValue] = useState({ channel: "", customerName: "", customerPhone: "", address: "", district: "", zoneId: "", reference: "", notes: "", paymentMethod: "", latitude: null, longitude: null, placeId: "", locationConfirmed: false });
  useEffect(() => {
    if (!remote || preview) return;
    try {
      const stored = JSON.parse(localStorage.getItem('foodflow:online-cart:' + code) || '{}');
      const valid = Object.entries(stored).filter(([, line]) => line && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 20 && typeof line.note === 'string');
      setCart(Object.fromEntries(valid.slice(0, 20)));
    } catch { /* Storage can be disabled without blocking checkout. */ }
    setCartLoaded(true);
  }, [code, remote, preview]);
  useEffect(() => {
    if (!remote || preview || !cartLoaded) return;
    try { localStorage.setItem('foodflow:online-cart:' + code, JSON.stringify(cart)); } catch { /* optional persistence */ }
  }, [cart, cartLoaded, code, remote, preview]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(null);
  const [detailItemId, setDetailItemId] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNote, setDetailNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [activeTab, setActiveTab] = useState(categories[0]?.id ?? OTHERS);
  const [cartOpen, setCartOpen] = useState(false);
  const cartDialogRef = useRef(null);
  const detailDialogRef = useRef(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [isPending, startTransition] = useTransition();
  const tabs = useMemo(() => {
    const list = categories.map(({ id, name }) => ({ id, name }));
    if (items.some((item) => item.categoryId == null)) list.push({ id: OTHERS, name: "Otros" });
    return list;
  }, [categories, items]);
  useEffect(() => { if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab(tabs[0]?.id ?? OTHERS); }, [tabs, activeTab]);
  const shown = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-PE");
    return items.filter((item) => query
      ? `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("es-PE").includes(query)
      : (item.categoryId ?? OTHERS) === activeTab);
  }, [items, activeTab, search]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const detailItem = detailItemId ? itemById.get(detailItemId) : null;
  useEffect(() => {
    const removed = Object.keys(cart).filter((id) => !itemById.has(id));
    if (!removed.length) return;
    setCart((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => itemById.has(id))));
    setError("Un plato dejó de estar en la carta y se quitó de tu pedido.");
  }, [cart, itemById]);
  const { count, total } = useMemo(() => {
    let quantity = 0, price = 0;
    for (const [id, line] of Object.entries(cart)) {
      const item = itemById.get(id);
      if (item) { quantity += line.qty; price += line.qty * item.price; }
    }
    return { count: quantity, total: price };
  }, [cart, itemById]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    if (cartOpen || detailItemId) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [cartOpen, detailItemId]);
  useEffect(() => {
    if (!detailItemId) return;
    const previousFocus = document.activeElement;
    const dialog = detailDialogRef.current;
    dialog?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setDetailItemId(null);
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previousFocus?.focus?.(); };
  }, [detailItemId]);
  useEffect(() => { if (detailItemId && !detailItem) setDetailItemId(null); }, [detailItemId, detailItem]);
  useEffect(() => {
    if (!cartOpen) return;
    const previousFocus = document.activeElement;
    const dialog = cartDialogRef.current;
    dialog?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setCartOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previousFocus?.focus?.(); };
  }, [cartOpen]);
  useEffect(() => {
    if (preview) return;
    const root = document.documentElement, previous = root.style.overflowX;
    root.style.overflowX = "visible";
    return () => { root.style.overflowX = previous; };
  }, [preview]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function setQty(id, qty) {
    setCart((previous) => {
      const next = { ...previous };
      if (qty <= 0) delete next[id];
      else next[id] = { qty: Math.min(qty, 20), note: previous[id]?.note ?? "" };
      return next;
    });
    setError("");
  }
  function setNote(id, note) { setCart((previous) => previous[id] ? { ...previous, [id]: { ...previous[id], note: note.slice(0, 140) } } : previous); }
  function openDetail(id) {
    setDetailQty(cart[id]?.qty ?? 1);
    setDetailNote(cart[id]?.note ?? "");
    setDetailItemId(id);
  }
  function addFromDetail() {
    if (!detailItem?.available) return;
    setCart((previous) => ({ ...previous, [detailItem.id]: { qty: detailQty, note: detailNote.trim().slice(0, 140) } }));
    setDetailItemId(null);
    setError("");
  }
  function send() {
    if (preview || submitting.current) return;
    if (count === 0 || Object.keys(cart).some((id) => !itemById.get(id)?.available)) return;
    setError("");
    const lines = Object.entries(cart).map(([menuItemId, line]) => ({ menuItemId, quantity: line.qty, note: line.note.trim() || undefined }));
    // What the diner is about to see on the status screen, kept before the cart is emptied.
    const summary = Object.entries(cart).map(([id, line]) => ({ name: itemById.get(id)?.name ?? "", price: itemById.get(id)?.price ?? 0, qty: line.qty, note: line.note.trim() }));
    submitting.current = true;
    startTransition(async () => {
      try {
        if (remote) {
          const deliveryFee = checkoutValue.channel === "delivery" ? state.ordering.zones.find(z => z.id === checkoutValue.zoneId)?.fee ?? 0 : 0;
          const payload = { slug: code, lines, ...checkoutValue, expectedTotal: (Math.round(total * 100) + Math.round(deliveryFee * 100)) / 100 };
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
          const signature = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
          let attempt = attemptRef.current;
          try { attempt = JSON.parse(sessionStorage.getItem('foodflow:checkout:' + code)) || attempt; } catch { /* optional storage */ }
          if (!attempt || attempt.signature !== signature) attempt = { signature, key: crypto.randomUUID() };
          attemptRef.current = attempt;
          try { sessionStorage.setItem('foodflow:checkout:' + code, JSON.stringify(attempt)); } catch { /* optional storage */ }
          const result = await submitOnlineOrder({ ...payload, checkoutKey: attempt.key });
          if (!result.ok) { setError(result.error); void refresh(); return; }
          try { localStorage.removeItem('foodflow:online-cart:' + code); } catch { /* optional storage */ }
          window.location.assign('/pedido/' + code + '/seguimiento/' + result.token);
          return;
        }
        const result = await submitTableOrder({ code, lines, customerName });
        if (!result.ok) {
          setError(result.detail ? `“${result.detail}” ya no está disponible. Quítalo y envía de nuevo.` : (ERRORS[result.code] ?? ERRORS.server));
          void refresh();
          return;
        }
        setSent({ round: result.round, total: result.total, lines: summary });
        setCart({});
        setCartOpen(false);
        void refresh();
      } catch { setError(remote ? "No pudimos confirmar el envío. Reintenta con el mismo carrito." : ERRORS.server); }
      finally { submitting.current = false; }
    });
  }

  if (sent) {
    const status = openTab && openTab.round >= sent.round ? openTab.status : "pending";
    return <Sent sent={sent} table={table} status={status} onAgain={() => { setSent(null); setActiveTab(tabs[0]?.id ?? OTHERS); }} />;
  }
  const zone = table?.zone ? (ZONE_LABELS_ES[table.zone] ?? table.zone) : null;
  const availability = remote ? (now ? orderingAvailability(state.ordering, venue.hours, now) : state.availability) : null;
  const checkout = remote ? { settings: state.ordering, venue, availability, value: checkoutValue, onChange: setCheckoutValue, preview } : null;
  const cartProps = { checkout, cart, itemById, count, total, openTab, customerName, setCustomerName, setQty, setNote, error, isPending, send, suggestions: SUGGESTIONS, tableName: table?.name };
  const open = remote ? availability.open : venue.hours && now ? isOpenAt(venue.hours, now) : null;
  const selectedFee = remote && checkoutValue.channel === "delivery" ? state.ordering.zones.find(z => z.id === checkoutValue.zoneId)?.fee ?? 0 : 0;

  // The hero shows the owner's cover on the ordering website, and otherwise the
  // first dish of what is on screen, as the prototype does; the rest follow as a list.
  const cover = remote ? state.ordering.coverUrl : "";
  const featured = !cover && shown.length > 0 ? shown[0] : null;
  const listed = featured ? shown.slice(1) : shown;
  const heroPhoto = cover || featured?.photoUrl || null;
  const heroQty = featured ? (cart[featured.id]?.qty ?? 0) : 0;
  const categoryName = tabs.find((tab) => tab.id === activeTab)?.name ?? "";
  const kitchenText = !online ? "Sin conexión" : remote && !availability.open ? "Pedidos pausados" : "Cocina en línea";

  return <div data-theme="dark" className={`${lbFontClasses} lb ${styles.stage} ${preview ? styles.preview : ""} ${preview && previewViewport === "mobile" ? styles.previewMobile : ""}`}>
    <div className={styles.glow} aria-hidden="true" />
    <header className={styles.hero}>
      {heroPhoto && <Image key={cover || featured?.id} src={heroPhoto} alt={cover ? `Portada de ${restaurantName}` : featured?.name ?? ""} fill sizes="100vw" className={styles.heroImg} priority />}
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroTop}>
        <span className={styles.chip}>{remote ? restaurantName : `${table.name} · ${restaurantName}`}</span>
        <span className={`${styles.chipLive} ${online && !(remote && !availability.open) ? "" : styles.offline}`}><i aria-hidden="true" />{kitchenText}</span>
      </div>
      <div className={styles.heroText}>
        {featured ? <>
          <span className={styles.eyebrow}>{(itemLabel(featured) ?? categoryName) || "Carta"}</span>
          <div className={styles.heroRow}>
            <div className={styles.heroCopy}>
              <h2 className={styles.heroTitle}>{featured.name}</h2>
              {featured.description && <p className={styles.heroDesc}>{featured.description}</p>}
              <span className={styles.heroPrice}>{featured.available ? formatCurrency(featured.price) : "Agotado por hoy"}</span>
            </div>
            {!featured.available ? <span className={styles.heroSold}>Agotado por hoy</span> : heroQty > 0
              ? <div className={styles.heroPill}><button type="button" onClick={() => setQty(featured.id, heroQty - 1)} aria-label="Quitar uno">−</button><span>{heroQty}</span><button type="button" onClick={() => setQty(featured.id, heroQty + 1)} aria-label="Agregar otro">+</button></div>
              : <button type="button" className={styles.heroAdd} onClick={() => setQty(featured.id, 1)} aria-label={`Agregar ${featured.name}`}>+</button>}
          </div>
        </> : <>
          <span className={styles.eyebrow}>{remote ? [state.ordering.delivery && "Delivery", state.ordering.pickup && "Recojo"].filter(Boolean).join(" · ") : zone ?? "Carta"}</span>
          <h2 className={styles.heroTitle}>{restaurantName}</h2>
          {venue.tagline && <p className={styles.heroDesc}>{venue.tagline}</p>}
        </>}
      </div>
    </header>

    <section className={styles.venue} aria-label="El local">
      <div className={styles.venueHead}>
        <span className={styles.venueBadge}>{venue.logoUrl ? <Image src={venue.logoUrl} alt="" fill sizes="44px" className={styles.venueLogo} /> : initialsFor(restaurantName)}</span>
        <div className={styles.venueText}><h1>{restaurantName}</h1>{venue.tagline && <p>{venue.tagline}</p>}</div>
      </div>
      <div className={styles.venueInfo}>
        {venue.address && <span>{venue.address}</span>}
        {venue.hours && now && <span>{todayLabel(venue.hours, remote ? peruWallTime(now) : now)} · <strong className={open ? "" : styles.closed}>{open ? "Abierto ahora" : "Cerrado"}</strong></span>}
        {remote ? <>
          <span>{[state.ordering.delivery && "Delivery", state.ordering.pickup && "Recojo en local"].filter(Boolean).join(" · ")} · Preparación {state.ordering.preparationMinutes} min</span>
          <span>{state.ordering.minimum > 0 ? 'Pedido mínimo S/ ' + state.ordering.minimum.toFixed(2) : 'Sin pedido mínimo'}</span>
          {state.ordering.delivery && <span>Delivery: tarifa según zona</span>}
        </> : <span>{table.name} · Pedido desde QR{zone ? ` · ${zone}` : ""}</span>}
      </div>
      {remote && !availability.open && <p role="status" className={styles.notice}>{availability.reason}</p>}
    </section>

    <div className={styles.layout}>
      <div className={styles.menuColumn}>
        <PreviousOrder openTab={openTab} />
        <div className={styles.menuIntro}><h2>{openTab ? "Elige otra ronda" : "Explora la carta"}</h2><span>{items.length} opciones</span></div>
        <label className={styles.searchLabel} htmlFor="table-menu-search">Buscar platos<input id="table-menu-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en la carta" /></label>
        {items.length > 0 && items.every((item) => !item.available) && <p className={styles.unavailableNotice}>Por ahora no hay platos disponibles. Consulta al personal del local.</p>}
        <nav className={styles.categoryNav} aria-label="Categorías de la carta">{tabs.map((tab) => <button key={tab.id} type="button" aria-current={!search && activeTab === tab.id ? "page" : undefined} className={!search && activeTab === tab.id ? styles.activeTab : ""} onClick={() => { setActiveTab(tab.id); setSearch(""); }}>{tab.name}</button>)}</nav>
        <div className={styles.cards}>
          {shown.length === 0 && <p className={styles.emptyCategory}>{search ? "No encontramos platos con esa búsqueda." : "No hay platos en esta categoría por ahora."}</p>}
          {featured && listed.length === 0 && <p className={styles.emptyCategory}>Es el único plato de esta sección.</p>}
          {listed.map((item) => {
            const qty = cart[item.id]?.qty ?? 0;
            const label = item.available ? itemLabel(item) : null;
            return <article key={item.id} className={`${styles.card} ${!item.available ? styles.cardSoldOut : ""}`}>
              <button type="button" className={styles.rowMain} onClick={() => openDetail(item.id)} aria-label={`Ver detalles de ${item.name}`}>
                <span className={styles.cardPhoto}>
                  {item.photoUrl ? <Image src={item.photoUrl} alt="" fill sizes="68px" className={styles.foodPhoto} /> : <span className={styles.noPhoto} aria-hidden="true">{initialsFor(item.name)}</span>}
                </span>
                <span className={styles.cardBody}>
                  <h3>{item.name}</h3>
                  {item.description && <span className={styles.cardDescription}>{item.description}</span>}
                  {label && <span className={styles.cardLabel}>{label}</span>}
                  <span className={styles.cardPrice}>{item.available ? formatCurrency(item.price) : "Agotado por hoy"}</span>
                </span>
              </button>
              {!item.available ? null : qty > 0
                ? <button type="button" className={styles.qtyBadge} onClick={() => setQty(item.id, qty + 1)} aria-label={`Agregar otro ${item.name} (tienes ${qty})`}>{qty}</button>
                : <button type="button" className={styles.addButton} onClick={() => setQty(item.id, 1)} aria-label={`Agregar ${item.name}`}>+</button>}
            </article>;
          })}
        </div>
      </div>
      <aside className={styles.desktopCart} aria-label="Resumen de mi pedido"><CartContent {...cartProps} mobile={false} /></aside>
    </div>

    {count > 0
      ? <div className={styles.bar}><span>{count} {count === 1 ? "plato" : "platos"} · {formatCurrency(total + selectedFee)}</span><button type="button" onClick={() => setCartOpen(true)}>Ver mi pedido</button></div>
      : <div className={styles.barEmpty}>Toca + para armar tu pedido</div>}
    {cartOpen && <div className={styles.backdrop} onClick={() => setCartOpen(false)} aria-hidden="true" />}
    <aside inert={!cartOpen ? true : undefined} ref={cartDialogRef} className={`${styles.mobileCart} ${cartOpen ? styles.cartOpen : ""}`} role="dialog" aria-modal="true" aria-labelledby="mobile-cart-title" aria-hidden={!cartOpen}><CartContent {...cartProps} mobile onClose={() => setCartOpen(false)} /></aside>
    {detailItem && <ProductDetail item={detailItem} qty={detailQty} note={detailNote} setQty={setDetailQty} setNote={setDetailNote} onAdd={addFromDetail} onClose={() => setDetailItemId(null)} dialogRef={detailDialogRef} suggestions={SUGGESTIONS} />}
  </div>;
}
