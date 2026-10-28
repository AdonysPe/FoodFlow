"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { submitOnlineOrder } from "@/lib/actions/publicOrder";
import { orderingAvailability, peruWallTime } from "@/lib/orderingWebsite";
import { NOTE_CHIPS } from "@/lib/comandaMeta";
import { formatCurrency } from "@/lib/format";
import { todayLabel, whatsappLink } from "@/lib/carta";
import { lbFontClasses } from "@/components/landing/lbFonts";
import OnlineCheckout, { ChannelSwitch } from "./OnlineCheckout";
import { cartaFontClasses, cartaTheme } from "./cartaThemes";
import styles from "./OnlineOrderExperience.module.css";

/**
 * The ordering website (/pedido/[slug]), as drawn in the "Web de pedidos"
 * prototype: Apple-style over design B, built for the phone first.
 *
 * On a phone it is one scroll — the cover, the Delivery / Recojo switch, the
 * search, categories that stay under the bar and follow the scroll, a row per
 * dish with a + on its photo — with a floating "Ver pedido" pill, sheets for
 * the dish and the order, and a checkout pushed in full screen. From 900 px of
 * its own width it is a page: a photo grid and the order in a column at the
 * right that turns into the checkout in place.
 *
 * The restaurant's template (set only by the platform admin) recolours it: a
 * classic one swaps ink, paper and type, the layout stays. Once the order is
 * placed the diner goes to the tracking page, which keeps design B's
 * "Estado del pedido".
 */

const OTHERS = "__otros__";
const POLL_MS = 8_000;
const SUGGESTIONS = [...new Set([...NOTE_CHIPS, "poco picante", "sin cubiertos"])];
const cents = (value) => Math.round(value * 100);

function initialsFor(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

const Icon = {
  plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  minus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>,
  info: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>,
  share: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4" /><path d="M6 12v7h12v-7" /></svg>,
  search: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></svg>,
  bag: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>,
  pin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  scooter: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="17" r="2.5" /><circle cx="18" cy="17" r="2.5" /><path d="M8.5 17h7M14 7h3l3 7.5M6 14.5V10h6l2 4.5" /></svg>,
};

/** The website's live state: re-read every few seconds while the tab is visible. */
function useOrderingState(slug, initial, preview) {
  const [state, setState] = useState(initial);
  const [online, setOnline] = useState(true);
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    if (preview) return;
    const request = ++latestRequest.current;
    try {
      const response = await fetch(`/api/pedido/${slug}`, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) setState((previous) => ({ ...previous, ordering: { ...previous.ordering, active: false } }));
        throw new Error("state unavailable");
      }
      const next = await response.json();
      if (request !== latestRequest.current) return;
      setState(next);
      setOnline(true);
    } catch { if (request === latestRequest.current) setOnline(false); }
  }, [slug, preview]);
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

/** A modal layer: holds the page still, traps Tab, closes on Escape, gives focus back. */
function useOverlay(open, ref, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const node = ref.current;
    node?.querySelector("button:not([tabindex='-1']), input, a[href]")?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !node) return;
      const focusable = [...node.querySelectorAll("button:not(:disabled):not([tabindex='-1']), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, ref]);
}

function Stepper({ qty, onChange, big = false, label, min = 0 }) {
  return <span className={`${styles.stepper} ${big ? styles.stepperBig : ""}`}>
    <button type="button" className={styles.press} disabled={qty <= min} onClick={() => onChange(qty - 1)} aria-label={qty === 1 && min === 0 ? `Quitar ${label}` : `Quitar uno de ${label}`}>
      {qty === 1 && min === 0 ? Icon.trash : Icon.minus}
    </button>
    <span aria-live="polite">{qty}</span>
    <button type="button" className={styles.press} disabled={qty >= 20} onClick={() => onChange(qty + 1)} aria-label={`Agregar uno de ${label}`}>{Icon.plus}</button>
  </span>;
}

function NoteChips({ note, setNote }) {
  const parts = note.split(",").map((part) => part.trim()).filter(Boolean);
  return <div className={styles.noteChips}>{SUGGESTIONS.map((chip) => {
    const selected = parts.some((part) => part.toLowerCase() === chip);
    return <button type="button" key={chip} aria-pressed={selected} onClick={() => setNote(selected ? parts.filter((part) => part.toLowerCase() !== chip).join(", ") : [...parts, chip].join(", "))}>{chip}</button>;
  })}</div>;
}

/** The lines of the order with their totals: the same body in the sheet and in the side column. */
function CartBody({ lines, subtotal, settings, channel, zone, minimum, setQty, openDish, error }) {
  const missing = Math.max(0, cents(minimum) - cents(subtotal)) / 100;
  if (lines.length === 0) {
    return <div className={styles.cartEmpty}>
      {Icon.bag}
      <strong>Todavía no agregas nada</strong>
      <span>Elige de la carta y tu pedido aparece aquí.</span>
    </div>;
  }
  return <div className={styles.cartBody}>
    <ul className={styles.lines}>
      {lines.map((line) => <li key={line.id} className={styles.line}>
        <span className={styles.lineThumb}>
          {line.item.photoUrl ? <Image src={line.item.photoUrl} alt="" fill sizes="56px" /> : initialsFor(line.item.name)}
        </span>
        <button type="button" className={styles.lineText} onClick={() => openDish(line.id)} aria-label={`Editar ${line.item.name}`}>
          <span className={styles.lineName}>{line.item.name}</span>
          {line.note && <span className={styles.lineNote}>{line.note}</span>}
          {line.item.available ? <span className={styles.lineTotal}>{formatCurrency(line.total)}</span> : <span className={styles.lineSold}>Agotado · quítalo para continuar</span>}
        </button>
        <Stepper qty={line.qty} label={line.item.name} onChange={(next) => setQty(line.id, next)} />
      </li>)}
    </ul>
    {missing > 0 && <div className={styles.progress} role="status">
      <span>Agrega <strong>{formatCurrency(missing)}</strong> más para llegar al pedido mínimo.</span>
      <span className={styles.progressBar}><span style={{ width: `${Math.min(100, Math.round((subtotal / minimum) * 100))}%` }} /></span>
    </div>}
    <div className={styles.sums}>
      <div><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
      {channel === "delivery" && settings.delivery && <div><span>Delivery</span><span>{zone ? formatCurrency(zone.fee) : "Según tu zona"}</span></div>}
      {channel === "pickup" && <div><span>Recojo</span><span>Sin costo</span></div>}
    </div>
    {error && <p role="alert" className={styles.alert}>{error}</p>}
  </div>;
}

export default function OnlineOrderExperience({ slug, initial, preview = false, previewViewport = "desktop" }) {
  const { state, online, refresh } = useOrderingState(slug, initial, preview);
  const theme = cartaTheme(state.template);
  const classic = theme.key !== "noche";
  const { restaurantName, categories, items, ordering: settings } = state;
  const venue = state.venue ?? {};

  const [cart, setCart] = useState({});
  const [cartLoaded, setCartLoaded] = useState(false);
  // `district`, `placeId` and `locationConfirmed` only steer the address step;
  // the server reads the zone, never the district the browser detected.
  const [checkoutValue, setCheckoutValue] = useState(() => ({
    channel: settings.delivery ? "delivery" : settings.pickup ? "pickup" : "",
    customerName: "", customerPhone: "", address: "", district: "", zoneId: "", reference: "", notes: "",
    paymentMethod: settings.payments[0]?.method ?? "",
    latitude: null, longitude: null, placeId: "", locationConfirmed: false,
  }));
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [solid, setSolid] = useState(false);
  const [now, setNow] = useState(null);
  const [dish, setDish] = useState(null);
  const [dishQty, setDishQty] = useState(1);
  const [dishNote, setDishNote] = useState("");
  const [sheet, setSheet] = useState(null);
  const [panel, setPanel] = useState("cart");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);
  const attemptRef = useRef(null);
  const sentinelRef = useRef(null);
  const chipsRef = useRef(null);
  const dishRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // The cart survives a reload of this restaurant's page.
  useEffect(() => {
    if (preview) return;
    try {
      const stored = JSON.parse(localStorage.getItem("foodflow:online-cart:" + slug) || "{}");
      const valid = Object.entries(stored).filter(([, line]) => line && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 20 && typeof line.note === "string");
      setCart(Object.fromEntries(valid.slice(0, 20)));
    } catch { /* Storage can be disabled without blocking checkout. */ }
    setCartLoaded(true);
  }, [slug, preview]);
  useEffect(() => {
    if (preview || !cartLoaded) return;
    try { localStorage.setItem("foodflow:online-cart:" + slug, JSON.stringify(cart)); } catch { /* optional persistence */ }
  }, [cart, cartLoaded, slug, preview]);

  // The global `overflow-x` on <html> would stop the bar and the categories from sticking.
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
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const tabs = useMemo(() => {
    const list = categories.map(({ id, name }) => ({ id, name }));
    if (items.some((item) => item.categoryId == null)) list.push({ id: OTHERS, name: "Otros" });
    return list;
  }, [categories, items]);
  const sections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-PE");
    return tabs.map((tab) => ({
      ...tab,
      items: items.filter((item) => (item.categoryId ?? OTHERS) === tab.id
        && (!query || `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("es-PE").includes(query))),
    })).filter((section) => section.items.length > 0);
  }, [tabs, items, search]);
  const current = sections.some((section) => section.id === active) ? active : sections[0]?.id ?? null;

  // A dish that left the carta leaves the cart too.
  useEffect(() => {
    const removed = Object.keys(cart).filter((id) => !itemById.has(id));
    if (!removed.length) return;
    setCart((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => itemById.has(id))));
    setError("Un plato dejó de estar en la carta y se quitó de tu pedido.");
  }, [cart, itemById]);

  // The bar turns solid once the cover has scrolled away.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setSolid(!entry.isIntersecting && entry.boundingClientRect.top < 60), { rootMargin: "-52px 0px 0px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  // The category under the bar is the one lit up: the last heading that has
  // reached the bar, or the last one once the page can scroll no further.
  // Captured on the document so it also follows the owner's preview frame.
  useEffect(() => {
    let frame = 0;
    const read = (scroller) => {
      frame = 0;
      const nodes = [...document.querySelectorAll("[data-order-section]")];
      if (!nodes.length) return;
      let hit = nodes[0];
      for (const node of nodes) {
        if (node.getBoundingClientRect().top < 150) hit = node;
        else break;
      }
      if (scroller && scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) hit = nodes[nodes.length - 1];
      setActive(hit.getAttribute("data-order-section"));
    };
    const onScroll = (event) => {
      const scroller = event.target === document ? document.scrollingElement : event.target;
      if (scroller?.closest?.("nav, aside")) return;
      if (!frame) frame = requestAnimationFrame(() => read(scroller));
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, [sections]);
  // …and stays in view inside the row of categories.
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector(`[data-chip="${current}"]`);
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [current]);

  const availability = now ? orderingAvailability(settings, venue.hours, now) : state.availability;
  const canAdd = preview || availability.open;
  const delivery = checkoutValue.channel === "delivery";
  const zone = delivery ? settings.zones.find((z) => z.id === checkoutValue.zoneId) ?? null : null;
  const minimum = Math.max(settings.minimum, zone?.minimum ?? 0);
  const lines = Object.entries(cart).map(([id, line]) => {
    const item = itemById.get(id);
    return item ? { id, item, qty: line.qty, note: line.note, name: item.name, total: item.price * line.qty } : null;
  }).filter(Boolean);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => cents(line.total) + sum, 0) / 100;
  const hasUnavailable = lines.some((line) => !line.item.available);
  const canContinue = count > 0 && !hasUnavailable && cents(subtotal) >= cents(minimum) && (preview || availability.open);
  const fees = settings.zones.map((z) => z.fee);
  const cover = settings.coverUrl || items.find((item) => item.photoUrl && item.available)?.photoUrl || "";
  const today = venue.hours && now ? todayLabel(venue.hours, peruWallTime(now)) : "";
  const whatsapp = whatsappLink(venue.whatsapp ?? null, `Hola ${restaurantName}, tengo una consulta sobre un pedido.`);
  const paused = !availability.open;
  const statusText = !online ? "Sin conexión · reintentando"
    : !paused ? `Abierto ahora${today ? ` · ${today}` : ""}`
    : settings.paused || !settings.accepting ? "Pedidos en pausa"
    : settings.active ? `Cerrado ahora${today ? ` · ${today}` : ""}` : "Web inactiva";
  const facts = delivery
    ? [["Llega en", `${settings.deliveryMinutes} min`], ["Delivery desde", fees.length ? formatCurrency(Math.min(...fees)) : "—"], ["Mínimo", settings.minimum > 0 ? formatCurrency(settings.minimum) : "Sin mínimo"]]
    : [["Listo en", `${settings.pickupMinutes} min`], ["Envío", "Sin costo"], ["Mínimo", settings.minimum > 0 ? formatCurrency(settings.minimum) : "Sin mínimo"]];
  const channelLine = delivery ? `Delivery · llega en unos ${settings.deliveryMinutes} min` : `Recojo en el local · listo en unos ${settings.pickupMinutes} min`;

  function setQty(id, qty) {
    setCart((previous) => {
      const next = { ...previous };
      if (qty <= 0) delete next[id];
      else next[id] = { qty: Math.min(qty, 20), note: previous[id]?.note ?? "" };
      return next;
    });
    setError("");
  }
  function openDish(id) {
    setDishQty(cart[id]?.qty ?? 1);
    setDishNote(cart[id]?.note ?? "");
    setDish(id);
  }
  function addDish() {
    const item = itemById.get(dish);
    if (!item?.available) return;
    setCart((previous) => ({ ...previous, [item.id]: { qty: dishQty, note: dishNote.trim().slice(0, 140) } }));
    setDish(null);
    setError("");
  }
  function setChannel(channel) { setCheckoutValue((value) => ({ ...value, channel })); }
  function goTo(id) {
    setActive(id);
    const node = document.getElementById(`order-sec-${id}`);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    node?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  async function share() {
    const url = `${window.location.origin}/pedido/${slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: `Pide en ${restaurantName}`, url }); return; }
    } catch (problem) { if (problem?.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); setToast("Enlace copiado"); } catch { setToast("No pudimos copiar el enlace"); }
  }

  function send() {
    if (preview || submitting.current) return;
    if (count === 0 || hasUnavailable) return;
    setError("");
    const orderLines = Object.entries(cart).map(([menuItemId, line]) => ({ menuItemId, quantity: line.qty, note: line.note.trim() || undefined }));
    submitting.current = true;
    startTransition(async () => {
      try {
        const deliveryFee = delivery ? zone?.fee ?? 0 : 0;
        const payload = { slug, lines: orderLines, ...checkoutValue, expectedTotal: (cents(subtotal) + cents(deliveryFee)) / 100 };
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
        const signature = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
        let attempt = attemptRef.current;
        try { attempt = JSON.parse(sessionStorage.getItem("foodflow:checkout:" + slug)) || attempt; } catch { /* optional storage */ }
        if (!attempt || attempt.signature !== signature) attempt = { signature, key: crypto.randomUUID() };
        attemptRef.current = attempt;
        try { sessionStorage.setItem("foodflow:checkout:" + slug, JSON.stringify(attempt)); } catch { /* optional storage */ }
        const result = await submitOnlineOrder({ ...payload, checkoutKey: attempt.key });
        if (!result.ok) { setError(result.error); void refresh(); return; }
        try { localStorage.removeItem("foodflow:online-cart:" + slug); } catch { /* optional storage */ }
        window.location.assign("/pedido/" + slug + "/seguimiento/" + result.token);
      } catch { setError("No pudimos confirmar el envío. Reintenta con el mismo carrito."); }
      finally { submitting.current = false; }
    });
  }

  const dishItem = dish ? itemById.get(dish) : null;
  useEffect(() => { if (dish && !dishItem) setDish(null); }, [dish, dishItem]);
  useOverlay(Boolean(dishItem), dishRef, () => setDish(null));
  useOverlay(Boolean(sheet) && !dishItem, sheetRef, () => setSheet(sheet === "checkout" ? "cart" : null));

  const rootClass = `${classic ? cartaFontClasses : lbFontClasses} ${styles.root} ${preview ? styles.preview : ""}`;
  const rootProps = { "data-classic": classic ? "" : undefined, "data-template": theme.key, style: classic ? theme.style : undefined };
  const layer = (node) => mounted ? createPortal(<div className={rootClass} {...rootProps}>{node}</div>, document.body) : null;
  const checkoutProps = { settings, venue, availability, value: checkoutValue, onChange: setCheckoutValue, subtotal, count, lines, isPending: isPending || hasUnavailable, error, send, preview };
  const cartProps = { lines, subtotal, settings, channel: checkoutValue.channel, zone, minimum, setQty, openDish, error };

  return <div className={rootClass} {...rootProps} style={{ ...rootProps.style, ...(preview && previewViewport === "mobile" ? { maxWidth: 390, marginInline: "auto" } : null) }}>
    <div className={styles.page}>
      <header className={`${styles.bar} ${cover ? "" : styles.noCover}`} data-solid={solid || !cover ? "" : undefined}>
        <button type="button" className={`${styles.barBtn} ${styles.press}`} onClick={() => setSheet("info")} aria-label="Información del local"><span className={styles.glass}>{Icon.info}</span></button>
        <span className={styles.barTitle}>{restaurantName}</span>
        <button type="button" className={`${styles.barBtn} ${styles.press}`} onClick={share} aria-label="Compartir esta web de pedidos"><span className={styles.glass}>{Icon.share}</span></button>
      </header>

      <header className={styles.head}>
        <div className={styles.headInner}>
          <div className={styles.headName}>
            {venue.logoUrl && <span className={styles.headLogo}><Image src={venue.logoUrl} alt="" fill sizes="32px" /></span>}
            <strong>{restaurantName}</strong>
            <span className={styles.status}><span className={`${styles.dot} ${paused || !online ? styles.dotWarn : ""}`} aria-hidden="true" />{statusText}</span>
          </div>
          <ChannelSwitch settings={settings} channel={checkoutValue.channel} onChange={setChannel} className={styles.headSeg} compact />
          <div className={styles.headMeta}>
            <span>{delivery ? `Llega en ${settings.deliveryMinutes} min` : `Listo en ${settings.pickupMinutes} min`}</span>
            <i aria-hidden="true" />
            <span>{settings.minimum > 0 ? `Mínimo ${formatCurrency(settings.minimum)}` : "Sin pedido mínimo"}</span>
            <i aria-hidden="true" />
            <button type="button" className={styles.linkBtn} onClick={() => setSheet("info")}>Información</button>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={`${styles.hero} ${cover ? "" : styles.bare}`} aria-label={restaurantName}>
          <div className={styles.heroMedia}>
            {cover && <Image src={cover} alt="" fill priority sizes="(min-width: 900px) 1240px, 100vw" className={styles.heroImg} />}
            <span className={styles.heroShade} aria-hidden="true" />
          </div>
          <span ref={sentinelRef} aria-hidden="true" />
          <div className={styles.heroText}>
            {venue.logoUrl && <span className={styles.heroLogo}><Image src={venue.logoUrl} alt="" fill sizes="52px" /></span>}
            <h1 className={styles.heroName}>{restaurantName}</h1>
            {(venue.tagline || venue.address) && <p className={styles.heroTag}>{venue.tagline || venue.address}</p>}
            <p className={styles.status} style={{ margin: 0 }}><span className={`${styles.dot} ${paused || !online ? styles.dotWarn : ""}`} aria-hidden="true" />{statusText}</p>
          </div>
          <dl className={`${styles.facts} ${styles.factsHero}`}>
            {facts.map(([key, value]) => <div key={key} className={styles.fact}><dt>{key}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>

        {paused && <div className={styles.notice} role="status">
          {Icon.pause}
          <div>
            <strong>{availability.reason}</strong>
            <span>{preview ? "Así ve tu web un cliente mientras no recibes pedidos." : "Puedes mirar la carta. Los pedidos se reciben cuando el local está atendiendo."}</span>
          </div>
        </div>}

        <ChannelSwitch settings={settings} channel={checkoutValue.channel} onChange={setChannel} className={styles.segWrap} />
        <dl className={styles.facts}>
          {facts.map(([key, value]) => <div key={key} className={styles.fact}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>

        <div className={styles.tools}>
          <label className={styles.search} htmlFor="order-search">
            {Icon.search}
            <span className={styles.sr}>Buscar en la carta</span>
            <input id="order-search" className={styles.searchInput} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en la carta" />
          </label>
          {sections.length > 1 && <nav ref={chipsRef} className={styles.chips} aria-label="Categorías">
            {sections.map((section) => <button key={section.id} type="button" data-chip={section.id} className={styles.chip} aria-current={current === section.id ? "true" : undefined} onClick={() => goTo(section.id)}>{section.name}</button>)}
          </nav>}
        </div>

        <div className={styles.layout}>
          <div className={styles.menu}>
            {items.length > 0 && items.every((item) => !item.available) && <p className={styles.allSold}>Por ahora no hay platos disponibles.</p>}
            {sections.length === 0 && <p className={styles.empty}>{search ? "No encontramos platos con esa búsqueda." : "Esta carta todavía no tiene platos."}</p>}
            {sections.map((section) => <section key={section.id} className={styles.section} aria-labelledby={`order-sec-${section.id}`}>
              <h2 id={`order-sec-${section.id}`} data-order-section={section.id} className={styles.sectionTitle}>{section.name}</h2>
              <ul className={styles.rows}>
                {section.items.map((item) => {
                  const qty = cart[item.id]?.qty ?? 0;
                  const addButton = !item.available || !canAdd ? null : qty > 0
                    ? <button type="button" className={`${styles.add} ${styles.press}`} data-count="" key={qty} onClick={() => setQty(item.id, qty + 1)} aria-label={`Agregar otro ${item.name}, llevas ${qty}`}>{qty}</button>
                    : <button type="button" className={`${styles.add} ${styles.press}`} onClick={() => setQty(item.id, 1)} aria-label={`Agregar ${item.name}`}>{Icon.plus}</button>;
                  return <li key={item.id} className={`${styles.row} ${item.available ? "" : styles.rowSold}`}>
                    <button type="button" className={styles.rowMain} onClick={() => openDish(item.id)} aria-label={`Ver ${item.name}`}>
                      <span className={styles.rowName}>{item.name}</span>
                      {item.description && <span className={styles.rowDesc}>{item.description}</span>}
                      <span className={styles.rowPrice}>{item.available ? formatCurrency(item.price) : "Agotado por hoy"}</span>
                    </button>
                    {item.photoUrl
                      ? <div className={styles.rowMedia}>
                          <span className={styles.rowPhoto}><Image src={item.photoUrl} alt="" fill sizes="(min-width: 900px) 320px, 104px" /></span>
                          {addButton}
                        </div>
                      : addButton && <div className={styles.rowNoMedia}>{addButton}</div>}
                  </li>;
                })}
              </ul>
            </section>)}
          </div>

          <aside className={styles.panel} aria-label="Tu pedido">
            <div className={styles.panelCard}>
              {panel === "checkout" && count > 0
                ? <div className={`${styles.panelCheckout} ${styles.panelStep}`} style={{ padding: "16px 0 0" }}>
                    <button type="button" className={`${styles.back} ${styles.press}`} onClick={() => setPanel("cart")}>{Icon.back}Tu pedido</button>
                    <h2 className={styles.pushHeading}>Confirmar pedido</h2>
                    <OnlineCheckout {...checkoutProps} idPrefix="checkout" />
                  </div>
                : <div className={styles.panelStep}>
                    <div className={styles.cartHead}>
                      <h2 className={styles.cartTitle}>Tu pedido</h2>
                      <span className={styles.cartSub}>{count === 1 ? "1 producto" : `${count} productos`}</span>
                    </div>
                    <CartBody {...cartProps} />
                    {count > 0 && <button type="button" className={`${styles.primary} ${styles.press}`} style={{ marginTop: 14 }} disabled={!canContinue} onClick={() => setPanel("checkout")}>
                      <span>Continuar</span><span>{formatCurrency(subtotal)}</span>
                    </button>}
                  </div>}
            </div>
            <p className={styles.panelNote}>Pedido directo a {restaurantName} · hecho con FoodFlow</p>
          </aside>
        </div>
      </div>

      <footer className={styles.foot}>
        <span>Pedido directo a {restaurantName} · hecho con FoodFlow</span>
        <a href="/privacidad" target="_blank" rel="noreferrer">Privacidad</a>
      </footer>

      {count > 0 && canAdd
        ? <div className={styles.dock}>
            <button type="button" className={`${styles.pill} ${styles.press}`} onClick={() => setSheet("cart")}>
              <span className={styles.pillCount}>{count}</span>
              <span className={styles.pillLabel}>Ver pedido</span>
              <span className={styles.pillTotal}>{formatCurrency(subtotal)}</span>
            </button>
          </div>
        : paused && <div className={styles.dock}><div className={styles.pillOff}>{settings.paused || !settings.accepting ? "Pedidos en pausa por ahora" : "Cerrado por ahora"}</div></div>}
    </div>

    {dishItem && layer(<div className={styles.layer} style={{ zIndex: 92 }}>
      <button type="button" className={styles.veil} tabIndex={-1} aria-label="Cerrar" onClick={() => setDish(null)} />
      <section ref={dishRef} className={`${styles.sheet} ${styles.dish}`} role="dialog" aria-modal="true" aria-labelledby="order-dish-title">
        <div className={styles.sheetScroll}>
          {dishItem.photoUrl
            ? <div className={styles.dishPhoto}>
                <span className={styles.dishGrab} aria-hidden="true" />
                <Image src={dishItem.photoUrl} alt={dishItem.name} fill sizes="(min-width: 900px) 560px, 100vw" />
                <button type="button" className={`${styles.close} ${styles.closeOnPhoto} ${styles.press}`} onClick={() => setDish(null)} aria-label="Cerrar"><span>{Icon.close}</span></button>
              </div>
            : <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 10px 0" }}>
                <button type="button" className={`${styles.close} ${styles.press}`} onClick={() => setDish(null)} aria-label="Cerrar"><span>{Icon.close}</span></button>
              </div>}
          <div className={styles.dishBody}>
            <h2 id="order-dish-title" className={styles.dishName}>{dishItem.name}</h2>
            {dishItem.description && <p className={styles.dishDesc}>{dishItem.description}</p>}
            {dishItem.available ? <span className={styles.dishPrice}>{formatCurrency(dishItem.price)}</span> : <span className={styles.dishSold}>Agotado por hoy</span>}
          </div>
          {dishItem.available && canAdd && <div className={styles.noteBox}>
            <label className={styles.field} htmlFor="order-dish-note">
              <span>Nota para la cocina (opcional)</span>
              <input id="order-dish-note" className={styles.input} maxLength={140} value={dishNote} onChange={(event) => setDishNote(event.target.value)} placeholder="Ej. sin ají, poco picante" />
            </label>
            <NoteChips note={dishNote} setNote={setDishNote} />
          </div>}
        </div>
        {dishItem.available && canAdd && <div className={styles.dishFoot}>
          <Stepper big min={1} qty={dishQty} label={dishItem.name} onChange={setDishQty} />
          <button type="button" className={`${styles.primary} ${styles.press}`} onClick={addDish}>
            <span>{cart[dishItem.id] ? "Actualizar" : "Agregar"}</span>
            <span>{formatCurrency(dishItem.price * dishQty)}</span>
          </button>
        </div>}
      </section>
    </div>)}

    {sheet === "cart" && layer(<div className={styles.layer}>
      <button type="button" className={styles.veil} tabIndex={-1} aria-label="Cerrar" onClick={() => setSheet(null)} />
      <section ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="order-cart-title">
        <span className={styles.grab} aria-hidden="true" />
        <div className={`${styles.sheetPad} ${styles.cartHead}`} style={{ paddingRight: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="order-cart-title" className={styles.cartTitle}>Tu pedido</h2>
            <span className={styles.cartSub}>{channelLine}</span>
          </div>
          <button type="button" className={`${styles.close} ${styles.press}`} onClick={() => setSheet(null)} aria-label="Cerrar"><span>{Icon.close}</span></button>
        </div>
        <div className={styles.sheetScroll} style={{ padding: "0 20px 8px" }}><CartBody {...cartProps} /></div>
        <div className={styles.sheetFoot}>
          {count > 0 && <button type="button" className={`${styles.primary} ${styles.press}`} disabled={!canContinue} onClick={() => setSheet("checkout")}>
            <span>Continuar</span><span>{formatCurrency(subtotal)}</span>
          </button>}
          <button type="button" className={styles.ghost} onClick={() => setSheet(null)}>Seguir viendo la carta</button>
        </div>
      </section>
    </div>)}

    {sheet === "checkout" && layer(<div className={styles.layer}>
      <section ref={sheetRef} className={styles.push} role="dialog" aria-modal="true" aria-labelledby="order-checkout-title">
        <div className={styles.pushNav}>
          <button type="button" className={`${styles.back} ${styles.press}`} onClick={() => setSheet("cart")}>{Icon.back}Tu pedido</button>
          <span className={styles.pushTitle}>{restaurantName}</span>
        </div>
        <div className={styles.pushScroll}>
          <h2 id="order-checkout-title" className={styles.pushHeading}>Confirmar pedido</h2>
          <OnlineCheckout {...checkoutProps} idPrefix="mobile-checkout" />
        </div>
      </section>
    </div>)}

    {sheet === "info" && layer(<div className={styles.layer}>
      <button type="button" className={styles.veil} tabIndex={-1} aria-label="Cerrar" onClick={() => setSheet(null)} />
      <section ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="order-info-title">
        <span className={styles.grab} aria-hidden="true" />
        <div className={`${styles.sheetPad} ${styles.cartHead}`} style={{ paddingRight: 10 }}>
          <h2 id="order-info-title" className={styles.cartTitle}>{restaurantName}</h2>
          <button type="button" className={`${styles.close} ${styles.press}`} onClick={() => setSheet(null)} aria-label="Cerrar"><span>{Icon.close}</span></button>
        </div>
        <div className={styles.sheetScroll}>
          <div className={styles.info}>
            {venue.tagline && <p style={{ margin: "0 0 6px", color: "var(--o-ink-2)" }}>{venue.tagline}</p>}
            {venue.address && <div className={styles.infoRow}>{Icon.pin}<span>{venue.address}{venue.mapsUrl && <small><a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a></small>}</span></div>}
            {today && <div className={styles.infoRow}>{Icon.clock}<span>{today}<small>{statusText}</small></span></div>}
            <div className={styles.infoRow}>{Icon.scooter}<span>
              {[settings.delivery && `Delivery en unos ${settings.deliveryMinutes} min`, settings.pickup && `Recojo en unos ${settings.pickupMinutes} min`].filter(Boolean).join(" · ")}
              <small>{settings.minimum > 0 ? `Pedido mínimo ${formatCurrency(settings.minimum)}` : "Sin pedido mínimo"}{settings.delivery && settings.zones.length ? ` · Reparto en ${settings.zones.map((z) => z.name).join(", ")}` : ""}</small>
            </span></div>
            {whatsapp && <div className={styles.infoActions}>
              <a className={`${styles.wa} ${styles.press}`} href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
            </div>}
          </div>
        </div>
        <div className={styles.sheetFoot}>
          <button type="button" className={`${styles.primary} ${styles.primaryCenter} ${styles.press}`} onClick={share}>Compartir esta web</button>
        </div>
      </section>
    </div>)}

    {toast && layer(<p className={styles.toast} role="status">{toast}</p>)}
  </div>;
}
