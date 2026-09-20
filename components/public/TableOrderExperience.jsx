"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { submitTableOrder, submitOnlineOrder } from "@/lib/actions/publicOrder";
import OnlineCheckout from "./OnlineCheckout";
import { orderingAvailability, peruWallTime } from "@/lib/orderingWebsite";
import { NOTE_CHIPS, ZONE_LABELS_ES } from "@/lib/comandaMeta";
import { formatCurrency } from "@/lib/format";
import { isOpenAt, todayLabel } from "@/lib/carta";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import styles from "./TableOrderExperience.module.css";
import cevicheriaStyles from "./TableOrderCevicheria.module.css";
import chifaStyles from "./TableOrderChifa.module.css";
import pizzeriaStyles from "./TableOrderPizzeria.module.css";

const OTHERS = "__otros__";
const POLL_MS = 8_000;
const SUGGESTIONS = [...new Set([...NOTE_CHIPS, "poco picante", "sin cubiertos"])];
const SEAFOOD_SUGGESTIONS = [...new Set([...SUGGESTIONS, "sin cancha", "limón adicional"])];
const CHIFA_SUGGESTIONS = [...new Set([...SUGGESTIONS, "sin cebolla china", "salsa aparte"])];
const PIZZA_SUGGESTIONS = [...new Set([...SUGGESTIONS, "sin orégano", "bien cocida"])];
const ERRORS = {
  invalid: "Revisa tu pedido y vuelve a intentar.",
  unknown_table: "Este código de mesa ya no es válido. Llama a un mozo.",
  closed: "Esta mesa no está disponible. Llama a un mozo.",
  unavailable: "Uno de los platos se acaba de agotar. Quítalo y envía de nuevo.",
  rate_limited: "Ya enviaste varias rondas desde esta mesa. Llama a un mozo para seguir pidiendo.",
  server: "No pudimos enviar tu pedido. Inténtalo de nuevo o llama a un mozo.",
};

function Pepper({ className = "" }) {
  return <svg className={className} viewBox="0 0 80 44" fill="none" aria-hidden="true">
    <path d="M22 13c7-5 16-2 17 6 1 9-12 16-31 18 8-7 11-15 14-24Z" />
    <path d="M25 13C25 7 30 3 36 3M27 13c4-3 8-4 13-2-2 3-6 5-10 5M41 21c12-4 23-1 33 7M52 21c4-7 10-8 15-6-2 4-6 7-13 7" />
  </svg>;
}

function CoastMotif({ className = "" }) {
  return <svg className={className} viewBox="0 0 100 58" fill="none" aria-hidden="true">
    <path d="M3 32c13-8 25-8 38 0s25 8 38 0c7-4 12-5 18-4M3 43c13-8 25-8 38 0s25 8 38 0c7-4 12-5 18-4" />
    <path d="M39 13c9-9 25-9 34 0-9 9-25 9-34 0ZM39 13l-9-6v12l9-6ZM61 12h.01" />
  </svg>;
}

function LatticeMotif({ className = "" }) {
  return <svg className={className} viewBox="0 0 100 58" fill="none" aria-hidden="true">
    <path d="M8 7h34v34H8zM16 15h18v18H16zM58 7h34v34H58zM66 15h18v18H66zM42 24h16M25 41v10M75 41v10" />
  </svg>;
}

function WheatMotif({ className = "" }) {
  return <svg className={className} viewBox="0 0 100 58" fill="none" aria-hidden="true">
    <path d="M49 54V5M49 16c-11-2-16-7-17-14 10 1 16 5 17 14Zm0 10c11-2 16-7 17-14-10 1-16 5-17 14Zm0 10c-11-2-16-7-17-14 10 1 16 5 17 14Zm0 10c11-2 16-7 17-14-10 1-16 5-17 14Z" />
    <path d="M11 49c11-7 21-7 32 0M57 49c11-7 21-7 32 0" />
  </svg>;
}

const visualThemes = {
  criolla: { className: "", Motif: Pepper },
  cevicheria: { className: cevicheriaStyles.theme, Motif: CoastMotif },
  chifa: { className: chifaStyles.theme, Motif: LatticeMotif },
  pizzeria: { className: pizzeriaStyles.theme, Motif: WheatMotif },
};

function initialsFor(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function itemLabel(template, item) {
  const detail = `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("es-PE");
  if (/picante|rocoto/.test(detail)) return "Picante";
  if (template === "cevicheria") {
    if (/pesca del d[ií]a/.test(detail)) return "Pesca del día";
    if (/^ceviche cl[aá]sico\b/.test(item.name.toLocaleLowerCase("es-PE"))) return "Recomendado";
  }
  if (template === "chifa") {
    if (/especial|tipakay|kam lu/.test(detail)) return "Especial de la casa";
    if (/chaufa|aeropuerto/.test(detail)) return "Más pedido";
  }
  if (template === "pizzeria") {
    if (/artesanal|masa madre/.test(detail)) return "Artesanal";
    if (/vegetarian|margarita/.test(detail)) return "Vegetariana";
    if (/especial de la casa|pepperoni/.test(detail)) return "Más pedida";
  }
  return null;
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

function ProductDetail({ item, qty, note, setQty, setNote, onAdd, onClose, Motif, dialogRef, suggestions }) {
  const parts = note.split(",").map((part) => part.trim()).filter(Boolean);
  return <>
    <div className={styles.detailBackdrop} onClick={onClose} aria-hidden="true" />
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="detail-title" className={styles.detailDialog}>
      <button type="button" className={styles.detailClose} onClick={onClose} aria-label="Cerrar detalle">×</button>
      <div className={styles.detailPhoto}>
        {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} fill sizes="(min-width: 700px) 560px, 100vw" className={styles.foodPhoto} /> : <div className={styles.noPhoto}><Motif className={styles.placeholderPepper} /></div>}
      </div>
      <div className={styles.detailBody}>
        <h2 id="detail-title">{item.name}</h2>
        {item.description && <p>{item.description}</p>}
        <div className={styles.detailMeta}><strong>{formatCurrency(item.price)}</strong><span>{item.available ? "Disponible" : "Agotado"}</span></div>
        <div className={styles.detailQuantity}><span>Cantidad</span><Quantity value={qty} min={1} onChange={setQty} /></div>
        <label className={styles.noteLabel} htmlFor="detail-note">Indicaciones especiales</label>
        <input id="detail-note" className={styles.noteInput} maxLength={140} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej. sin cebolla" />
        <div className={styles.noteChips}>{suggestions.map((chip) => {
          const selected = parts.some((part) => part.toLowerCase() === chip);
          return <button type="button" key={chip} aria-pressed={selected} onClick={() => setNote(selected ? parts.filter((part) => part.toLowerCase() !== chip).join(", ") : [...parts, chip].join(", "))}>{chip}</button>;
        })}</div>
        <button type="button" className={styles.sendButton} disabled={!item.available} onClick={onAdd}>{item.available ? "Agregar al pedido" : "Agotado"}</button>
      </div>
    </section>
  </>;
}

function PreviousOrder({ openTab }) {
  if (!openTab) return null;
  const status = { pending: "Pedido recibido", preparing: "En preparación", ready: "Listo para servir", delivered: "Servido" }[openTab.status] ?? "En cocina";
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
    {lines.length === 0 ? <p className={styles.emptyCart}>Aún no agregaste platos. Elige algo rico de la carta.</p> : <ul className={styles.cartLines}>
      {lines.map(({ item, qty, note }) => {
        const parts = note.split(",").map((part) => part.trim()).filter(Boolean);
        return <li key={item.id} className={styles.cartLine}>
          <div className={styles.cartLineTop}>
            <div><h3>{item.name}</h3><span>{formatCurrency(item.price * qty)}</span></div>
            <Quantity compact value={qty} onChange={(next) => setQty(item.id, next)} />
          </div>
          {!item.available && <p className={styles.cartUnavailable}>Agotado · quítalo para enviar el pedido</p>}
          <label className={styles.noteLabel} htmlFor={`note-${mobile ? "mobile" : "desktop"}-${item.id}`}>Indicaciones para cocina</label>
          <input id={`note-${mobile ? "mobile" : "desktop"}-${item.id}`} value={note} onChange={(event) => setNote(item.id, event.target.value)} maxLength={140} placeholder="Ej. sin cebolla" className={styles.noteInput} />
          <div className={styles.noteChips}>{suggestions.map((chip) => {
            const selected = parts.some((part) => part.toLowerCase() === chip);
            return <button key={chip} type="button" aria-pressed={selected} onClick={() => setNote(item.id, selected ? parts.filter((part) => part.toLowerCase() !== chip).join(", ") : [...parts, chip].join(", "))}>{chip}</button>;
          })}</div>
        </li>;
      })}
    </ul>}
    <div className={styles.cartBottom}>
      {checkout ? <OnlineCheckout {...checkout} subtotal={total} count={count} isPending={isPending || hasUnavailable} error={error} send={send} mobile={mobile} /> : <>
      <p className={styles.cartTable}>{tableName} · Pedido desde QR</p>
      {!openTab && count > 0 && <label className={styles.nameLabel}>Nombre para la cuenta <span>(opcional)</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={60} placeholder="¿A nombre de quién?" /></label>}
      <p className={styles.totalRow}><span>Subtotal</span><strong>{formatCurrency(total)}</strong></p>
      <p className={styles.totalRowMain}><span>Total</span><strong>{formatCurrency(total)}</strong></p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.sendButton} disabled={count === 0 || hasUnavailable || isPending} onClick={send}>{isPending ? "Enviando…" : "Enviar pedido a cocina"}</button>
      <p className={styles.sendHint}>Tu pedido será enviado directamente a cocina.</p>
      </>}
    </div>
  </div>;
}

function Sent({ sent, table, status, onAgain, themeClass, Motif }) {
  const step = status === "ready" || status === "delivered" ? 2 : status === "preparing" ? 1 : 0;
  return <div className={`${styles.sentScreen} ${themeClass}`}><div className={styles.sentPaper}>
    <Motif className={styles.sentPepper} />
    <h1>¡Pedido enviado!</h1>
    <p>{sent.round > 1 ? `Ronda ${sent.round} · ` : ""}{table.name} · Total de la mesa {formatCurrency(sent.total)}</p>
    <ol className={styles.steps}>{["Pedido recibido", "En preparación", "Listo para servir"].map((label, index) => <li key={label} className={index <= step ? styles.stepDone : ""}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>
    <p className={styles.sentExplanation}>Tu pedido viajó digitalmente a la pantalla de cocina. Aquí verás cómo avanza.</p>
    <button type="button" onClick={onAgain} className={styles.againButton}>Volver a la carta</button>
  </div></div>;
}

export default function TableOrderExperience({ code, initial, template = undefined, remote = false, preview = false, previewViewport = "desktop" }) {
  const { state, online, refresh } = useTableState(code, initial, remote, preview);
  const { table, restaurantName, categories, items, openTab } = state;
  const venue = state.venue ?? {};
  const templateKey = resolveMenuTemplate(template ?? state.template);
  const theme = menuTemplates[templateKey];
  const { className: themeClass, Motif } = visualThemes[templateKey];
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
        setSent({ round: result.round, total: result.total });
        setCart({});
        setCartOpen(false);
        void refresh();
      } catch { setError(remote ? "No pudimos confirmar el envío. Reintenta con el mismo carrito." : ERRORS.server); }
      finally { submitting.current = false; }
    });
  }

  if (sent) {
    const status = openTab && openTab.round >= sent.round ? openTab.status : "pending";
    return <Sent sent={sent} table={table} status={status} themeClass={themeClass} Motif={Motif} onAgain={() => { setSent(null); setActiveTab(tabs[0]?.id ?? OTHERS); }} />;
  }
  const zone = table?.zone ? (ZONE_LABELS_ES[table.zone] ?? table.zone) : null;
  const suggestions = templateKey === "cevicheria" ? SEAFOOD_SUGGESTIONS : templateKey === "chifa" ? CHIFA_SUGGESTIONS : templateKey === "pizzeria" ? PIZZA_SUGGESTIONS : SUGGESTIONS;
  const availability = remote ? (now ? orderingAvailability(state.ordering, venue.hours, now) : state.availability) : null;
  const checkout = remote ? { settings: state.ordering, venue, availability, value: checkoutValue, onChange: setCheckoutValue, preview } : null;
  const cartProps = { checkout, cart, itemById, count, total, openTab, customerName, setCustomerName, setQty, setNote, error, isPending, send, suggestions, tableName: table?.name };
  const open = remote ? availability.open : venue.hours && now ? isOpenAt(venue.hours, now) : null;
  const selectedFee = remote && checkoutValue.channel === "delivery" ? state.ordering.zones.find(z => z.id === checkoutValue.zoneId)?.fee ?? 0 : 0;
  return <div className={`${styles.stage} ${preview ? styles.preview : ""} ${preview && previewViewport === "mobile" ? styles.previewMobile : ""} ${count > 0 ? styles.hasCart : ""} ${themeClass}`}>
    <div className={styles.paperTexture} aria-hidden="true" />
    {remote && state.ordering.coverUrl && <div className={styles.storeCover}><Image src={state.ordering.coverUrl} alt={`Portada de ${restaurantName}`} fill sizes="100vw" className={styles.foodPhoto} priority /></div>}
    <header className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.heroIdentity}>
        <span className={styles.venueBadge}>{venue.logoUrl ? <Image src={venue.logoUrl} alt="" fill sizes="56px" className={styles.venueLogo} /> : initialsFor(restaurantName)}</span>
        <div><h1>{restaurantName}</h1><p className={styles.heroSubtitle}>{venue.tagline || theme.subtitle}</p></div>
      </div>
      <Motif className={styles.heroPepper} />
      {(venue.address || venue.hours) && <div className={styles.venueInfo}>
        {venue.address && <span>{venue.address}</span>}
        {venue.hours && now && <span>{todayLabel(venue.hours, remote ? peruWallTime(now) : now)} · <strong>{open ? "Abierto ahora" : "Cerrado"}</strong></span>}
      </div>}
      <div className={styles.heroMeta}>
        {remote ? <span className={styles.tableTag}>{[state.ordering.delivery && "Delivery", state.ordering.pickup && "Recojo en local"].filter(Boolean).join(" · ")} · Preparación {state.ordering.preparationMinutes} min</span> : <span className={styles.tableTag}>{table.name} · Pedido desde QR{zone ? ` · ${zone}` : ""}</span>}
        <span className={`${styles.kitchenLive} ${online ? "" : styles.offline}`}><i aria-hidden="true" />{!online ? "Actualizando conexión" : remote && !availability.open ? "Pedidos no disponibles" : "Cocina recibiendo pedidos"}</span>
      </div>
      {remote && <div className={styles.venueInfo}><span>{state.ordering.minimum > 0 ? 'Pedido mínimo S/ ' + state.ordering.minimum.toFixed(2) : 'Sin pedido mínimo'}</span>{state.ordering.delivery && <span>Delivery: tarifa según zona</span>}{!availability.open && <p role="status">{availability.reason}</p>}</div>}
    </div></header>
    <div className={styles.layout}>
      <div className={styles.menuColumn}>
        <PreviousOrder openTab={openTab} />
        <div className={styles.menuIntro}><h2>{openTab ? "Elige otra ronda" : "Explora la carta"}</h2><span>{items.length} opciones</span></div>
        <label className={styles.searchLabel} htmlFor="table-menu-search">Buscar platos<input id="table-menu-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca un plato o ingrediente" /></label>
        {items.length > 0 && items.every((item) => !item.available) && <p className={styles.unavailableNotice}>Por ahora no hay platos disponibles. Consulta al personal del local.</p>}
        <nav className={styles.categoryNav} aria-label="Categorías de la carta">{tabs.map((tab) => <button key={tab.id} type="button" aria-current={!search && activeTab === tab.id ? "page" : undefined} className={!search && activeTab === tab.id ? styles.activeTab : ""} onClick={() => { setActiveTab(tab.id); setSearch(""); }}>{tab.name}</button>)}</nav>
        <div className={styles.cards}>
          {shown.length === 0 && <p className={styles.emptyCategory}>{search ? "No encontramos platos con esa búsqueda." : "No hay platos en esta categoría por ahora."}</p>}
          {shown.map((item) => {
            const qty = cart[item.id]?.qty ?? 0;
            const label = item.available ? itemLabel(templateKey, item) : null;
            return <article key={item.id} className={`${styles.card} ${!item.available ? styles.cardSoldOut : ""}`}>
              <div className={styles.cardPhoto}>
                {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} fill sizes="(min-width: 1000px) 350px, (min-width: 640px) 45vw, 90vw" className={styles.foodPhoto} /> : <div className={styles.noPhoto}><Motif className={styles.placeholderPepper} /></div>}
                {label && <span className={styles.seafoodLabel}>{label}</span>}
                {!item.available ? <span className={styles.soldOut}>Agotado</span> : <span className={styles.available}><i aria-hidden="true" />Disponible</span>}
              </div>
              <div className={styles.cardBody}>
                <h3>{item.name}</h3>{item.description && <p className={styles.cardDescription}>{item.description}</p>}
                {item.prepMin != null && <p className={styles.prepTime}>{item.prepMin} min aprox.</p>}
                <button type="button" className={styles.detailsLink} onClick={() => openDetail(item.id)}>Ver detalles</button>
                <div className={styles.cardFoot}><strong>{formatCurrency(item.price)}</strong>
                  {!item.available ? <button type="button" disabled className={styles.addButton}>Agotado</button> : qty ? <Quantity value={qty} onChange={(next) => setQty(item.id, next)} /> : <button type="button" className={styles.addButton} onClick={() => setQty(item.id, 1)}>Agregar <span aria-hidden="true">+</span></button>}
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
      <aside className={styles.desktopCart} aria-label="Resumen de mi pedido"><CartContent {...cartProps} mobile={false} /></aside>
    </div>
    {count > 0 && <div className={styles.mobileBar}><div><strong>{count} {count === 1 ? "producto" : "productos"}</strong><span>{formatCurrency(total + selectedFee)}</span></div><button type="button" onClick={() => setCartOpen(true)}>Ver mi pedido</button></div>}
    {cartOpen && <div className={styles.backdrop} onClick={() => setCartOpen(false)} aria-hidden="true" />}
    <aside inert={!cartOpen ? true : undefined} ref={cartDialogRef} className={`${styles.mobileCart} ${cartOpen ? styles.cartOpen : ""}`} role="dialog" aria-modal="true" aria-labelledby="mobile-cart-title" aria-hidden={!cartOpen}><CartContent {...cartProps} mobile onClose={() => setCartOpen(false)} /></aside>
    {detailItem && <ProductDetail item={detailItem} qty={detailQty} note={detailNote} setQty={setDetailQty} setNote={setDetailNote} onAdd={addFromDetail} onClose={() => setDetailItemId(null)} Motif={Motif} dialogRef={detailDialogRef} suggestions={suggestions} />}
  </div>;
}
