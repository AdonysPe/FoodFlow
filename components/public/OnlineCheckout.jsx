"use client";

import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import styles from "./TableOrderExperience.module.css";

export default function OnlineCheckout({ settings, venue, availability, value, onChange, subtotal, count, isPending, error, send, mobile, preview }) {
  const prefix = mobile ? "mobile-checkout" : "checkout";
  const set = (key, next) => onChange({ ...value, [key]: next });
  const zone = value.channel === "delivery" ? settings.zones.find(z => z.id === value.zoneId && z.available) : null;
  const fee = zone?.fee ?? 0;
  const minimum = Math.max(settings.minimum, zone?.minimum ?? 0);
  const payment = settings.payments.find(p => p.method === value.paymentMethod);
  const field = (key, label, props = {}) => <label className={styles.nameLabel} htmlFor={`${prefix}-${key}`}>{label}<input id={`${prefix}-${key}`} value={value[key]} onChange={event => set(key, event.target.value)} {...props} /></label>;
  return <form className={styles.checkout} onSubmit={event => { event.preventDefault(); send(); }}>
    <h3>Completa tu pedido</h3>
    <label className={styles.nameLabel} htmlFor={`${prefix}-channel`}>¿Cómo lo recibes?
      <select id={`${prefix}-channel`} value={value.channel} onChange={e => set("channel", e.target.value)} required>
        <option value="" disabled>Elige delivery o recojo</option>
        {settings.delivery && <option value="delivery">Delivery</option>}
        {settings.pickup && <option value="pickup">Recojo en local</option>}
      </select>
    </label>
    {!settings.delivery && <p className={styles.sendHint}>Delivery no disponible. Puedes recoger en el local.</p>}
    {value.channel && <>
      {field("customerName", "Nombre", { required: true, minLength: 2, maxLength: 80, autoComplete: "name" })}
      {field("customerPhone", "Teléfono", { type: "tel", required: true, pattern: "[+0-9 ()\\-]{7,20}", maxLength: 20, autoComplete: "tel" })}
      {value.channel === "delivery" ? <>
        <label className={styles.nameLabel} htmlFor={`${prefix}-zone`}>Zona atendida
          <select id={`${prefix}-zone`} value={value.zoneId} onChange={event => set("zoneId", event.target.value)} required>
            <option value="">Selecciona tu zona</option>
            {settings.zones.filter(z => z.available).map(z => <option key={z.id} value={z.id}>{z.name} · {formatCurrency(z.fee)}</option>)}
          </select>
        </label>
        <p className={styles.sendHint}>Si tu zona no aparece, no tenemos cobertura allí.</p>
        {field("address", "Dirección", { required: true, minLength: 5, maxLength: 200, autoComplete: "street-address" })}
        {field("reference", "Referencia (opcional)", { maxLength: 160 })}
      </> : <p>Recoge en {venue.address}. {settings.pickupInstructions}</p>}
      {field("notes", "Indicaciones (opcional)", { maxLength: 300 })}
      <label className={styles.nameLabel} htmlFor={`${prefix}-payment`}>Forma de pago
        <select id={`${prefix}-payment`} value={value.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} required>
          <option value="" disabled>Elige cómo pagar</option>
          {settings.payments.map(p => <option key={p.method} value={p.method}>{PAYMENT_METHOD_LABELS[p.method]}</option>)}
        </select>
      </label>
      {payment && <p className={styles.sendHint}>{payment.instructions} El restaurante confirmará el cobro.</p>}
    </>}
    <p>{venue.name} · {value.channel === "delivery" ? "Delivery" : value.channel === "pickup" ? "Recojo" : "Elige una modalidad"}</p>
    {value.channel && <p>Tiempo estimado: {value.channel === "delivery" ? settings.deliveryMinutes : settings.pickupMinutes} min</p>}
    {settings.instructions && <p>{settings.instructions}</p>}
    <p className={styles.totalRow}><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></p>
    {value.channel === "delivery" && <p className={styles.totalRow}><span>Delivery</span><strong>{zone ? formatCurrency(fee) : "Elige zona"}</strong></p>}
    <p className={styles.totalRowMain}><span>Total</span><strong>{formatCurrency((Math.round(subtotal * 100) + Math.round(fee * 100)) / 100)}</strong></p>
    {minimum > subtotal && <p role="status">Pedido mínimo: {formatCurrency(minimum)} (sin delivery).</p>}
    {!availability.open && <p role="status">{availability.reason}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button className={styles.sendButton} disabled={preview || !availability.open || !count || isPending || subtotal < minimum || !value.channel || (value.channel === "delivery" && !zone)}>{isPending ? "Enviando…" : preview ? "Vista previa" : "Realizar pedido"}</button>
    <p className={styles.sendHint}>Revisa los productos y el total antes de confirmar. Tus datos se usarán para atender este pedido. <a href="/privacidad" target="_blank" rel="noreferrer">Privacidad</a></p>
  </form>;
}
