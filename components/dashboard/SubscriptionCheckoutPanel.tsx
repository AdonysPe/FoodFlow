"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  confirmSubscriptionCheckout,
  createSubscriptionCheckout,
  getSubscriptionCheckoutStatus,
  getSubscriptionStatus,
} from "@/lib/actions/subscription";
import { PLAN_LABELS, type PlanValue } from "@/lib/plans";
import PlanManagementButton from "@/components/dashboard/PlanManagementButton";
import { buildWhatsAppUrl } from "@/lib/contact";
import type {
  CheckoutNext,
  CheckoutStatusOutput,
  ConfirmCheckoutOutput,
  CreateCheckoutOutput,
  SubscriptionView,
} from "@/lib/subscriptions/contract";

declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      settings: (settings: CheckoutNext["settings"]) => void;
      options: (options: { paymentMethods: Record<string, boolean> }) => void;
      open: () => void;
    };
    Culqi3DS?: {
      publicKey: string;
      settings: { charge: { totalAmount: number; returnUrl: string }; card: { email: string } };
      initAuthentication: (tokenId: string) => void;
    };
    culqi?: () => void;
  }
}

type Props = { restaurantId: string; restaurantName: string };
type DocumentKind = "boleta" | "factura";

function money(cents: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(cents / 100);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)!;
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No pudimos cargar la pasarela.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error("No pudimos cargar la pasarela."));
    document.head.appendChild(script);
  });
}

const inputClass = "w-full rounded-xl border border-fg/[0.12] bg-ink-950/55 px-3.5 py-3 text-[14px] text-fg outline-none placeholder:text-faint focus:border-accent-400/60";

export default function SubscriptionCheckoutPanel({ restaurantId, restaurantName }: Props) {
  const search = useSearchParams();
  const callbackRef = useRef<((tokenId: string) => void) | null>(null);
  const [view, setView] = useState<SubscriptionView | null>(null);
  const [checkout, setCheckout] = useState<CreateCheckoutOutput | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatusOutput | null>(null);
  const [plan, setPlan] = useState<PlanValue>("carta");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [documentKind, setDocumentKind] = useState<DocumentKind>("boleta");
  const [ruc, setRuc] = useState("");
  const [legalName, setLegalName] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedOffer = view?.offers.find((offer) => offer.plan === plan);

  useEffect(() => {
    const requested = search.get("plan");
    if (requested && ["carta", "servicio", "negocio"].includes(requested) && view?.offers.some((offer) => offer.plan === requested)) {
      setPlan(requested as PlanValue);
    }
  }, [search, view]);

  const refreshStatus = useCallback(async () => {
    const result = await getSubscriptionStatus();
    if (result.ok) {
      setView(result.data);
      if (result.data.openCheckout) {
        const status = await getSubscriptionCheckoutStatus(result.data.openCheckout.id);
        if (status.ok) setCheckoutStatus(status.data);
      }
    } else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  // The 3DS return query is only a lookup key. It never changes subscription state.
  useEffect(() => {
    const id = search.get("checkout");
    if (!id) return;
    let live = true;
    void getSubscriptionCheckoutStatus(id).then((result) => {
      if (!live) return;
      if (result.ok) setCheckoutStatus(result.data);
      else setError(result.error);
    });
    return () => { live = false; };
  }, [search]);

  useEffect(() => {
    if (!checkoutStatus || !["created", "requires_action", "processing"].includes(checkoutStatus.status)) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      const result = await getSubscriptionCheckoutStatus(checkoutStatus.checkoutId);
      if (!stopped && result.ok) {
        setCheckoutStatus(result.data);
        if (["completed", "failed", "expired", "canceled"].includes(result.data.status)) void refreshStatus();
      }
    };
    const timer = window.setInterval(() => { void poll(); }, 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [checkoutStatus?.checkoutId, checkoutStatus?.status, refreshStatus]);

  const explainResult = useCallback((result: ConfirmCheckoutOutput) => {
    setCheckoutStatus({
      checkoutId: result.checkoutId,
      status: result.status,
      plan: checkout?.plan ?? plan,
      trialDays: checkout?.trialDays ?? 0,
      failureCode: null,
      returnPath: "/dashboard/app/configuracion",
      expiresAt: checkout?.expiresAt ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    if (result.status === "processing") setMessage("Estamos confirmando tu pago. El acceso se actualizará cuando la pasarela confirme el cobro.");
    if (result.status === "completed") setMessage("El pago quedó confirmado. Actualizando el estado de tu suscripción…");
    if (result.status === "requires_action") {
      void (async () => {
        try {
          await loadScript("https://3ds.culqi.com");
          if (!window.Culqi3DS) throw new Error("No pudimos iniciar la verificación de seguridad de la tarjeta.");
          window.Culqi3DS.publicKey = checkout!.next.publicKey;
          window.Culqi3DS.settings = {
            charge: { totalAmount: result.threeDS.totalAmount, returnUrl: result.threeDS.returnUrl },
            card: { email: result.threeDS.email },
          };
          setMessage("Tu banco solicita una verificación segura para continuar.");
          window.Culqi3DS.initAuthentication((window as Window & { __ffToken?: string }).__ffToken ?? "");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos iniciar la verificación 3-D Secure."); }
      })();
    }
  }, [checkout, plan]);

  useEffect(() => {
    const receive3DS = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { parameters3DS?: unknown } | null;
      if (!data?.parameters3DS || !checkout) return;
      setPending(true);
      void confirmSubscriptionCheckout({ checkoutId: checkout.checkoutId, tokenId: (window as Window & { __ffToken?: string }).__ffToken ?? "", authentication3DS: data.parameters3DS as never })
        .then((result) => {
          if (!result.ok) { setError(result.error); return; }
          explainResult(result.data);
        }).finally(() => setPending(false));
    };
    window.addEventListener("message", receive3DS);
    return () => window.removeEventListener("message", receive3DS);
  }, [checkout, explainResult]);

  async function confirmToken(tokenId: string) {
    if (!checkout) return;
    setPending(true); setError(""); setMessage("Enviando la tarjeta para confirmar el intento…");
    const result = await confirmSubscriptionCheckout({ checkoutId: checkout.checkoutId, tokenId });
    setPending(false);
    if (!result.ok) { setError(result.error); setMessage(""); return; }
    (window as Window & { __ffToken?: string }).__ffToken = tokenId;
    explainResult(result.data);
  }

  async function startCardCheckout() {
    if (!checkout) return;
    setError(""); setMessage(""); setPending(true);
    try {
      await loadScript("https://checkout.culqi.com/js/v4");
      if (!window.Culqi) throw new Error("No pudimos abrir la pasarela. Inténtalo nuevamente.");
      window.Culqi.publicKey = checkout.next.publicKey;
      window.Culqi.settings(checkout.next.settings);
      window.Culqi.options({ paymentMethods: { tarjeta: true, yape: false, bancaMovil: false, agente: false, billetera: false, cuotealo: false } });
      callbackRef.current = (tokenId) => { void confirmToken(tokenId); };
      window.culqi = () => {
        const culqi = window as Window & { Culqi?: typeof window.Culqi; culqi?: () => void };
        const token = (culqi as unknown as { Culqi?: { token?: { id?: string }; error?: { user_message?: string } } }).Culqi;
        if (token?.token?.id) callbackRef.current?.(token.token.id);
        else if (token?.error) { setError(token.error.user_message || "La tarjeta no pudo validarse."); setMessage(""); }
      };
      window.Culqi.open();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos abrir la pasarela."); }
    finally { setPending(false); }
  }

  async function createCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view || !terms) return;
    setPending(true); setError(""); setMessage("");
    const idempotencyKey = crypto.randomUUID();
    const result = await createSubscriptionCheckout({
      restaurantId, plan, idempotencyKey, acceptTerms: true,
      customer: { firstName, lastName, phone, address, city },
      billingDocument: documentKind === "boleta" ? { type: "boleta" } : { type: "factura", ruc, legalName },
      returnPath: "/dashboard/app/configuracion",
    });
    setPending(false);
    if (!result.ok) { setError(result.error); return; }
    setCheckout(result.data);
    setCheckoutStatus({ checkoutId: result.data.checkoutId, status: result.data.status, plan: result.data.plan, trialDays: result.data.trialDays, failureCode: null, returnPath: "/dashboard/app/configuracion", expiresAt: result.data.expiresAt });
    setMessage("Intento de pago creado. Usa el formulario seguro de Culqi para ingresar tu tarjeta.");
  }

  const whatsapp = buildWhatsAppUrl(`Hola FoodFlow, necesito ayuda con el plan de ${restaurantName}.`);
  const statusText = checkoutStatus?.status === "processing" ? "Estamos confirmando tu pago" : checkoutStatus?.status === "completed" ? "Pago confirmado" : checkoutStatus?.status === "failed" ? "El pago no se completó" : checkoutStatus?.status === "expired" ? "El intento de pago venció" : checkoutStatus?.status === "canceled" ? "El intento de pago fue reemplazado" : checkoutStatus?.status === "created" || checkoutStatus?.status === "requires_action" ? "Checkout iniciado" : "";

  if (loading) return <p className="mt-5 text-[13px] text-faint" aria-live="polite">Consultando las opciones de suscripción…</p>;
  if (!view) return <p className="mt-4 text-[13px] text-warn-ink" role="alert">{error || "No pudimos consultar el estado de la suscripción."}</p>;

  return <div className="mt-5 border-t border-fg/[0.08] pt-5">
    <h4 className="text-[14px] font-semibold text-fg">Contratar o cambiar plan</h4>
    <p className="mt-1 text-[12.5px] leading-relaxed text-faint">El plan se aplica a {restaurantName}. El cobro y el acceso se confirman en el servidor.</p>
    {view.subscription && <p className="mt-3 rounded-xl bg-fg/[0.04] px-3.5 py-3 text-[12.5px] text-fg/75">Suscripción {view.subscription.status}. Tarjeta {view.subscription.card.brand ?? "registrada"} terminada en {view.subscription.card.last4 ?? "----"}. {view.subscription.cancelAtPeriodEnd ? "Cancelación al cierre del periodo." : ""}</p>}
    {!view.canManage && <p className="mt-3 text-[13px] text-faint">Solo el dueño del restaurante puede contratar o cambiar el plan.</p>}
    {view.canManage && !view.checkoutEnabled && <p className="mt-3 text-[13px] text-faint">El pago con tarjeta todavía no está disponible. Puedes coordinar por WhatsApp.</p>}
    {view.canManage && !view.checkoutEnabled && <PlanManagementButton currentPlan={view.plan} className="mt-3 w-full" splitActions />}
    {view.canManage && view.checkoutEnabled && !checkout && <form onSubmit={createCheckout} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-[12px] text-faint sm:col-span-2">Plan<select className={`${inputClass} mt-1`} value={plan} onChange={(e) => setPlan(e.target.value as PlanValue)}>{view.offers.map((offer) => <option key={offer.plan} value={offer.plan}>{PLAN_LABELS[offer.plan]} — {money(offer.price.netCents)} + IGV / mes</option>)}</select></label>
      {selectedOffer && <div className="rounded-xl border border-fg/[0.08] bg-fg/[0.025] p-3.5 text-[12.5px] text-fg/75 sm:col-span-2"><p>{money(selectedOffer.price.netCents)} netos + {money(selectedOffer.price.igvCents)} IGV ({selectedOffer.price.igvRateBps / 100}%) = <strong>{money(selectedOffer.price.grossCents)} {selectedOffer.price.currency}/mes</strong></p><p className="mt-1">{selectedOffer.trialDays > 0 ? `${selectedOffer.trialDays} días de prueba; se solicitará una tarjeta y luego empezarán los cobros mensuales.` : "Cobro mensual con tarjeta."}</p></div>}
      <label className="text-[12px] text-faint">Nombres<input className={`${inputClass} mt-1`} required minLength={2} maxLength={50} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" /></label>
      <label className="text-[12px] text-faint">Apellidos<input className={`${inputClass} mt-1`} required minLength={2} maxLength={50} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" /></label>
      <label className="text-[12px] text-faint">Celular<input className={`${inputClass} mt-1`} required inputMode="tel" placeholder="987 654 321" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
      <label className="text-[12px] text-faint sm:col-span-2">Dirección<input className={`${inputClass} mt-1`} required minLength={5} maxLength={100} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></label>
      <label className="text-[12px] text-faint">Ciudad<input className={`${inputClass} mt-1`} required minLength={2} maxLength={30} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /></label>
      <label className="text-[12px] text-faint">Comprobante<select className={`${inputClass} mt-1`} value={documentKind} onChange={(e) => setDocumentKind(e.target.value as DocumentKind)}><option value="boleta">Boleta</option><option value="factura">Factura</option></select></label>
      {documentKind === "factura" && <><label className="text-[12px] text-faint">RUC<input className={`${inputClass} mt-1`} required inputMode="numeric" minLength={11} maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value)} /></label><label className="text-[12px] text-faint">Razón social<input className={`${inputClass} mt-1`} required minLength={3} maxLength={120} value={legalName} onChange={(e) => setLegalName(e.target.value)} /></label></>}
      <label className="flex gap-2.5 text-[12px] leading-relaxed text-faint sm:col-span-2"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-0.5 accent-accent-400" /><span>Acepto la suscripción mensual, el precio y el IGV indicados. Autorizo los cobros recurrentes a la tarjeta que registre en Culqi; puedo solicitar la cancelación.</span></label>
      {error && <p className="text-[13px] text-warn-ink sm:col-span-2" role="alert">{error}</p>}
      <button type="submit" disabled={pending || !selectedOffer} className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-3 text-[14px] font-semibold text-on-accent disabled:opacity-50 sm:col-span-2">{pending ? "Preparando checkout…" : "Continuar al pago seguro"}</button>
    </form>}
    {view.canManage && view.checkoutEnabled && checkout && <div className="mt-4 rounded-xl border border-fg/[0.09] bg-fg/[0.025] p-4">
      <p className="text-[13px] font-semibold text-fg">{PLAN_LABELS[checkout.plan]} · {money(checkout.price.grossCents)} PEN al mes, incluido IGV</p>
      {checkout.trialDays > 0 && <p className="mt-1 text-[12.5px] text-faint">Prueba de {checkout.trialDays} días; luego se iniciarán los cobros recurrentes.</p>}
      <p className="mt-2 text-[12.5px] text-faint">La tarjeta se ingresa en Culqi. FoodFlow no recibe el número de tarjeta.</p>
      <button type="button" onClick={() => void startCardCheckout()} disabled={pending} className="mt-4 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-3 text-[14px] font-semibold text-on-accent disabled:opacity-50">{pending ? "Conectando…" : "Ingresar tarjeta en Culqi"}</button>
      <button type="button" onClick={() => { setCheckout(null); setCheckoutStatus(null); setMessage(""); setError(""); }} className="mt-2 w-full rounded-xl border border-fg/[0.1] px-4 py-2.5 text-[13px] text-fg/75">Volver a los datos del titular</button>
    </div>}
    {(statusText || message) && <div className="mt-4 rounded-xl border border-accent-400/20 bg-accent-400/[0.06] p-4 text-[13px] text-fg/80" aria-live="polite"><p className="font-semibold">{statusText || (checkoutStatus?.status === "processing" ? "Estamos confirmando tu pago" : "Estado del checkout")}</p><p className="mt-1">{message || (checkoutStatus?.status === "processing" ? "La pasarela está procesando la suscripción. Esta pantalla consultará el estado real automáticamente." : `Estado consultado: ${checkoutStatus?.status}.`)}</p>{checkoutStatus?.status === "failed" && <p className="mt-1">{checkoutStatus.failureCode === "card_declined" ? "La tarjeta fue rechazada. Puedes intentar con otra." : "Puedes volver a iniciar el pago o contactarnos para recibir ayuda."}</p>}</div>}
    {error && <p className="mt-3 text-[13px] text-warn-ink" role="alert">{error}</p>}
    {view.canManage && whatsapp && (!view.checkoutEnabled || checkoutStatus?.status === "failed" || checkoutStatus?.status === "expired") && <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[13px] font-semibold text-accent-label underline-offset-4 hover:underline">Contactar al equipo por WhatsApp</a>}
  </div>;
}
