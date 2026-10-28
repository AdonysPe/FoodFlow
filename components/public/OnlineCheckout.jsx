"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { matchZoneByDistrict } from "@/lib/orderingWebsite";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import DeliveryLocationPicker from "./DeliveryLocationPicker";
import styles from "./OnlineOrderExperience.module.css";

const OUT_OF_RANGE = "Todavía no realizamos entregas en esta ubicación. Puedes elegir otra dirección o pedir para recojo.";
const cents = (value) => Math.round(value * 100);

function Check() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}

const PAYMENT_ICONS = {
  efectivo: <><rect x="3" y="6" width="18" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /></>,
  yape: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></>,
  transferencia: <><path d="M4 10h16M5 10V18M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 4l8 4H4l8-4z" /></>,
};

/**
 * Delivery / Recojo as a segmented control with a sliding thumb, or a plain
 * line when the restaurant offers only one of them.
 */
export function ChannelSwitch({ settings, channel, onChange, className = "", compact = false }) {
  if (!(settings.delivery && settings.pickup)) {
    return <p className={`${styles.segSolo} ${className}`}>
      {settings.delivery ? "Solo delivery" : "Solo recojo en el local"}
      <small>{settings.delivery ? settings.deliveryMinutes : settings.pickupMinutes} min</small>
    </p>;
  }
  return <div role="group" aria-label="Cómo recibes tu pedido" className={`${styles.seg} ${compact ? styles.segCompact : ""} ${className}`} data-pickup={channel === "pickup" ? "" : undefined}>
    <span className={styles.segThumb} aria-hidden="true" />
    <button type="button" className={styles.segBtn} aria-pressed={channel === "delivery"} onClick={() => onChange("delivery")}>
      Delivery{!compact && <small>{settings.deliveryMinutes} min</small>}
    </button>
    <button type="button" className={styles.segBtn} aria-pressed={channel === "pickup"} onClick={() => onChange("pickup")}>
      Recojo{!compact && <small>{settings.pickupMinutes} min</small>}
    </button>
  </div>;
}

/**
 * The ordering website's checkout: grouped sections, iOS-settings style —
 * delivery or pickup, contact, payment, notes and the summary — with the
 * "Realizar pedido" button stuck to the bottom and, above it, the one thing
 * still missing when it cannot be pressed yet.
 */
export default function OnlineCheckout({ settings, venue, availability, value, onChange, subtotal, count, lines, isPending, error, send, idPrefix = "checkout", preview }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const patch = (next) => onChange({ ...value, ...next });
  const zones = settings.zones.filter((z) => z.available);
  const delivery = value.channel === "delivery";
  const zone = delivery ? zones.find((z) => z.id === value.zoneId) ?? null : null;
  const fee = zone?.fee ?? 0;
  const minimum = Math.max(settings.minimum, zone?.minimum ?? 0);
  const payment = settings.payments.find((p) => p.method === value.paymentMethod);
  // `null` until the picker reports back. Only a hard "unavailable" lifts the
  // confirm-the-pin requirement — a slow map must not let an order slip past.
  const [mapsStatus, setMapsStatus] = useState(null);

  // Whatever Google called the district decides which configured zone gets
  // preselected. Done once per detected district so the diner can still
  // override it by hand afterwards.
  const lastDistrict = useRef("");
  useEffect(() => {
    const district = value.district ?? "";
    if (value.channel !== "delivery" || district === lastDistrict.current) return;
    lastDistrict.current = district;
    if (!district) return;
    const match = matchZoneByDistrict(zones, district);
    if ((match?.id ?? "") !== value.zoneId) onChange({ ...value, zoneId: match?.id ?? "" });
    // Reacting to the detected district only; `value` is read, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.district, value.channel]);

  const noCoverage = delivery && Boolean(value.district) && !matchZoneByDistrict(zones, value.district);
  const awaitingConfirmation = delivery && mapsStatus !== "unavailable" && !value.locationConfirmed;
  const total = (cents(subtotal) + cents(fee)) / 100;

  // The first thing that keeps the order from going out, said once, above the button.
  const blocker = preview ? "Vista previa: los pedidos no se envían desde aquí."
    : !availability.open ? availability.reason
    : !count ? "Agrega productos a tu pedido."
    : !value.channel ? "Elige delivery o recojo."
    : delivery && awaitingConfirmation ? "Confirma tu dirección para continuar."
    : delivery && !zone ? "Elige tu zona de reparto."
    : cents(subtotal) < cents(minimum) ? `Te faltan ${formatCurrency((cents(minimum) - cents(subtotal)) / 100)} para el pedido mínimo de ${formatCurrency(minimum)}.`
    : !payment ? "Elige cómo pagar."
    : "";

  const field = (key, label, props = {}) => <label className={styles.field} htmlFor={`${idPrefix}-${key}`}>
    <span>{label}</span>
    <input id={`${idPrefix}-${key}`} className={styles.input} value={value[key]} onChange={(event) => set(key, event.target.value)} {...props} />
  </label>;

  return <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (!blocker) send(); }}>
    {settings.delivery && settings.pickup && <ChannelSwitch settings={settings} channel={value.channel} onChange={(channel) => set("channel", channel)} className={styles.segWrapCheckout} compact />}

    {delivery ? <>
      <h3 className={styles.h}>Entrega</h3>
      <div className={styles.group}>
        {value.locationConfirmed
          ? <div className={styles.placed}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
              <div>
                <strong>{value.address}</strong>
                {value.reference && <span>Referencia: {value.reference}</span>}
              </div>
              <button type="button" className={styles.linkBtn} onClick={() => patch({ locationConfirmed: false })}>Cambiar</button>
            </div>
          : <DeliveryLocationPicker idPrefix={idPrefix} value={value} onChange={patch} onStatusChange={setMapsStatus}>
              {field("reference", "Referencia (opcional)", { maxLength: 160, placeholder: "Ej. puerta negra, al lado de la bodega" })}
            </DeliveryLocationPicker>}
      </div>

      <h3 className={styles.h}>Zona de reparto</h3>
      <div className={styles.group} role="group" aria-label="Zona de reparto">
        {zones.map((z) => <button key={z.id} type="button" className={styles.choice} aria-pressed={value.zoneId === z.id} onClick={() => set("zoneId", z.id)}>
          <span className={styles.choiceText}>{z.name}{z.minimum > settings.minimum && <small>Pedido mínimo {formatCurrency(z.minimum)}</small>}</span>
          <span className={styles.choiceMeta}>{formatCurrency(z.fee)}</span>
          <span className={styles.radio} aria-hidden="true">{value.zoneId === z.id && <Check />}</span>
        </button>)}
      </div>
      {noCoverage ? <p role="status" className={`${styles.note} ${styles.noteWarn}`}>{OUT_OF_RANGE}</p>
        : zone ? <p className={`${styles.note} ${styles.noteOk}`}>Entregamos en {zone.name} · llega en unos {settings.deliveryMinutes} min.</p>
        : <p className={styles.note}>¿Tu zona no aparece? Todavía no llegamos ahí.{settings.pickup ? " Puedes elegir Recojo." : ""}</p>}
    </> : value.channel === "pickup" ? <>
      <h3 className={styles.h}>Recojo en el local</h3>
      <div className={`${styles.group} ${styles.groupPad}`}>
        <div className={styles.pickup}>
          <span className={styles.pickupIcon} aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          </span>
          <span>
            <strong>Recoge en {venue.address || venue.name}</strong>
            {settings.pickupInstructions && <span>{settings.pickupInstructions}</span>}
            <em>Listo en unos {settings.pickupMinutes} min</em>
          </span>
        </div>
      </div>
    </> : null}

    <h3 className={styles.h}>Contacto</h3>
    <div className={styles.group}>
      {field("customerName", "Nombre", { required: true, minLength: 2, maxLength: 80, autoComplete: "name", placeholder: "¿A nombre de quién?" })}
      <label className={styles.field} htmlFor={`${idPrefix}-customerPhone`}>
        <span>Teléfono</span>
        <span className={styles.phone}>
          <span aria-hidden="true">+51</span>
          <input id={`${idPrefix}-customerPhone`} className={styles.input} type="tel" inputMode="tel" required pattern="[+0-9 ()\-]{7,20}" maxLength={20} autoComplete="tel-national" placeholder="9XX XXX XXX" value={value.customerPhone} onChange={(event) => set("customerPhone", event.target.value)} />
        </span>
      </label>
    </div>
    <p className={styles.note}>El restaurante te llamará a este número si hace falta.</p>

    <h3 className={styles.h}>Pago</h3>
    <div className={styles.group} role="group" aria-label="Forma de pago">
      {settings.payments.map((p) => <button key={p.method} type="button" className={styles.choice} aria-pressed={value.paymentMethod === p.method} onClick={() => set("paymentMethod", p.method)}>
        <span className={styles.choiceIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{PAYMENT_ICONS[p.method]}</svg>
        </span>
        <span className={styles.choiceText}>{PAYMENT_METHOD_LABELS[p.method]}</span>
        <span className={styles.radio} aria-hidden="true">{value.paymentMethod === p.method && <Check />}</span>
      </button>)}
    </div>
    {payment && <p className={styles.note}>{payment.instructions} El restaurante confirmará el cobro.</p>}

    <h3 className={styles.h}>Indicaciones (opcional)</h3>
    <div className={styles.group}>
      <label className={styles.field} htmlFor={`${idPrefix}-notes`}>
        <span className={styles.sr}>Indicaciones para el restaurante</span>
        <textarea id={`${idPrefix}-notes`} className={styles.input} rows={2} maxLength={300} placeholder="Ej. tocar el timbre, sin cubiertos" value={value.notes} onChange={(event) => set("notes", event.target.value)} />
      </label>
    </div>
    {settings.instructions && <p className={styles.note}>{settings.instructions}</p>}

    <h3 className={styles.h}>Resumen</h3>
    <div className={`${styles.group} ${styles.groupPad}`}>
      <ul className={styles.summaryLines}>
        {lines.map((line) => <li key={line.id}><span>{line.qty}×</span><span>{line.name}</span><span>{formatCurrency(line.total)}</span></li>)}
      </ul>
      <div className={styles.sums}>
        <div><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        {delivery && <div><span>Delivery</span><span>{zone ? formatCurrency(fee) : "Elige tu zona"}</span></div>}
        {value.channel === "pickup" && <div><span>Recojo</span><span>Sin costo</span></div>}
        <div className={styles.sumTotal}><span>Total</span><span>{formatCurrency(total)}</span></div>
      </div>
    </div>

    <div className={styles.submit}>
      {error && <p role="alert" className={styles.alert} style={{ margin: 0 }}>{error}</p>}
      {blocker && <p role="status" className={styles.submitWhy}>{blocker}</p>}
      <button type="submit" className={`${styles.primary} ${styles.press}`} disabled={Boolean(blocker) || isPending}>
        <span>{isPending ? "Enviando…" : "Realizar pedido"}</span>
        <span>{formatCurrency(total)}</span>
      </button>
      <p className={styles.legal}>Revisa los productos y el total antes de confirmar. Tus datos se usan para atender este pedido. <a href="/privacidad" target="_blank" rel="noreferrer">Privacidad</a></p>
    </div>
  </form>;
}
