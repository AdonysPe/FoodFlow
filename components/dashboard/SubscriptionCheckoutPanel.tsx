"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  confirmSubscriptionCheckout,
  createSubscriptionCheckout,
  getSubscriptionCheckoutStatus,
  getSubscriptionStatus,
  previewPlanChange,
} from "@/lib/actions/subscription";
import { FEATURE_LABELS, PLAN_FEATURES, PLAN_LABELS, PLAN_MAX_USERS, PLANS, type FeatureValue, type PlanValue } from "@/lib/plans";
import PlanManagementButton from "@/components/dashboard/PlanManagementButton";
import BillingStatusBadge from "@/components/dashboard/BillingStatusBadge";
import { buildWhatsAppUrl } from "@/lib/contact";
import type {
  CheckoutNext,
  CheckoutStatusOutput,
  ConfirmCheckoutOutput,
  CreateCheckoutOutput,
  PlanChangePreview,
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

function dateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // 24-hour clock: "p. m." ends in a period and every sentence here adds one.
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(date);
}

const BILLING_LABEL: Record<SubscriptionView["status"], string> = {
  pending: "Pago pendiente de confirmación",
  trialing: "En periodo de prueba",
  active: "Suscripción activa",
  past_due: "Pago atrasado",
  suspended: "Suscripción suspendida",
  cancelled: "Suscripción cancelada",
};

const CANCEL_REASON_LABEL = {
  price: "El precio",
  not_using: "Ya no lo uso",
  missing_feature: "Me falta una función",
  closing: "Cierro el restaurante",
  other: "Otro motivo",
} as const;

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

// Every module the plans can include, in the order the plans add them.
const ALL_FEATURES = PLAN_FEATURES.negocio as readonly FeatureValue[];

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
  const [changePreview, setChangePreview] = useState<PlanChangePreview | null>(null);
  const [targetPlan, setTargetPlan] = useState<PlanValue | "">("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState<keyof typeof CANCEL_REASON_LABEL>("other");
  const changeKeyRef = useRef<string | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  // The cancel dialog mounts in the panel root: this card blurs its backdrop,
  // which would otherwise trap a fixed overlay inside it.
  useEffect(() => { setHost(document.querySelector(".lbd") ?? document.body); }, []);
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

  useEffect(() => {
    if (!cancelDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) setCancelDialog(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cancelDialog, pending]);

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
        if (["completed", "failed", "expired", "canceled"].includes(result.data.status)) {
          if (result.data.status === "completed") setMessage(result.data.purpose === "upgrade"
            ? `El pago se confirmó. El plan ${PLAN_LABELS[result.data.plan]} ya está activo.`
            : "La suscripción se confirmó. Actualizando el estado del restaurante…");
          if (result.data.status === "failed") setMessage(result.data.failureCode === "card_declined"
            ? "El cargo fue rechazado. Tu plan actual sigue vigente. Contacta al equipo para revisar el medio de pago."
            : "No se pudo completar el cambio. Tu plan actual sigue vigente; puedes contactar al equipo.");
          void refreshStatus();
        }
      }
    };
    const timer = window.setInterval(() => { void poll(); }, 15_000);
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

  async function loadChangePreview(targetPlan: PlanValue) {
    setPending(true); setError(""); setMessage(""); setChangePreview(null);
    const result = await previewPlanChange({ restaurantId, targetPlan });
    setPending(false);
    if (!result.ok) { setError(result.error); return; }
    setChangePreview(result.data);
    changeKeyRef.current = crypto.randomUUID();
  }

  async function confirmChange() {
    if (!changePreview || pending || changePreview.blockers.length > 0) return;
    setPending(true); setError(""); setMessage("");
    const result = await changeSubscriptionPlan({
      restaurantId,
      targetPlan: changePreview.targetPlan,
      idempotencyKey: changeKeyRef.current ?? crypto.randomUUID(),
      confirm: true,
    });
    setPending(false);
    if (!result.ok) { setError(result.error); return; }
    changeKeyRef.current = null;
    setChangePreview(null);
    if (result.data.kind === "scheduled") {
      setMessage(`El cambio a ${PLAN_LABELS[changePreview.targetPlan]} quedó programado para ${dateTime(result.data.effectiveAt)}.`);
      await refreshStatus();
      return;
    }
    setCheckoutStatus({
      checkoutId: result.data.checkoutId,
      status: result.data.status,
      purpose: "upgrade",
      plan: changePreview.targetPlan,
      trialDays: 0,
      failureCode: null,
      returnPath: "/dashboard/app/configuracion",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    setMessage("El cargo del nuevo plan está en proceso. Mantendremos tu plan actual hasta que Culqi confirme el pago.");
  }

  async function confirmCancel() {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    const result = await cancelSubscription({ restaurantId, confirm: true, reason: cancelReason });
    setPending(false);
    if (!result.ok) { setError(result.error); setCancelDialog(false); return; }
    setCancelDialog(false);
    setMessage(result.data.accessUntil
      ? `La renovación quedó cancelada. Mantendrás el acceso hasta ${dateTime(result.data.accessUntil)}.`
      : "La suscripción quedó cancelada y el periodo de acceso terminó.");
    await refreshStatus();
  }

  const whatsapp = buildWhatsAppUrl(`Hola FoodFlow, necesito ayuda con el plan de ${restaurantName}.`);
  const statusText = checkoutStatus?.status === "processing" ? "Estamos confirmando el cambio de plan" : checkoutStatus?.status === "completed" ? "Cambio confirmado" : checkoutStatus?.status === "failed" ? "El cambio no se completó" : checkoutStatus?.status === "expired" ? "El intento de cambio venció" : checkoutStatus?.status === "canceled" ? "El intento de cambio fue reemplazado" : checkoutStatus?.status === "created" || checkoutStatus?.status === "requires_action" ? "Cambio en curso" : "";
  if (loading) return <p className="lbd-sb-loading" aria-live="polite"><span className="lbd-bl-spin" aria-hidden="true" />Consultando las opciones de suscripción…</p>;
  if (!view) return <p className="lbd-modal-error" role="alert">{error || "No pudimos consultar el estado de la suscripción."}</p>;
  const currentSubscription = view.subscription;
  const currentPlan = currentSubscription?.plan ?? view.plan;
  const subscriptionPrice = view.source === "provider" ? currentSubscription?.price : null;
  const currentPrice = view.offers.find((offer) => offer.plan === view.plan)?.price;
  const nextDate = view.status === "trialing"
    ? currentSubscription?.trialEndsAt ?? currentSubscription?.accessUntil
    : view.status === "active" && !currentSubscription?.cancelAtPeriodEnd
      ? currentSubscription?.currentPeriodEnd ?? currentSubscription?.accessUntil
      : currentSubscription?.accessUntil ?? currentSubscription?.currentPeriodEnd;
  const whenLabel = view.status === "trialing" ? "Prueba hasta" : view.status === "past_due" ? "Acceso disponible hasta" : view.status === "cancelled" || currentSubscription?.cancelAtPeriodEnd ? "Acceso vigente hasta" : "Próximo cobro";
  // How far into the trial the venue is, when the backend says how long it lasts.
  const trialLength = view.offers.find((offer) => offer.plan === currentPlan)?.trialDays ?? 0;
  const trialEnd = view.status === "trialing" && currentSubscription?.trialEndsAt ? new Date(currentSubscription.trialEndsAt).getTime() : NaN;
  const trialDay = trialLength > 0 && Number.isFinite(trialEnd) ? Math.min(trialLength, Math.max(1, trialLength - Math.ceil((trialEnd - Date.now()) / 86_400_000) + 1)) : null;
  const shownPlan = view.source === "none" && view.canManage && view.checkoutEnabled ? plan : currentPlan;
  const seats = PLAN_MAX_USERS[shownPlan];
  const notes: { text: string; tone?: "warn" | "dim" }[] = [];
  if (view.source === "provider" && view.status === "trialing" && currentSubscription?.trialEndsAt) notes.push({ text: "Después de la prueba comenzará el cobro mensual de la tarjeta registrada." });
  if (view.source === "provider" && currentSubscription?.cancelAtPeriodEnd) notes.push({ text: "La renovación está detenida; no se programarán nuevos cobros." });
  if (view.status === "past_due") notes.push({ text: "El último cobro falló. El acceso continúa durante el periodo de gracia mientras se reintenta.", tone: "warn" });
  if (view.status === "suspended") notes.push({ text: "El acceso a funciones de pago está suspendido. Contacta al equipo para revisar el estado.", tone: "warn" });
  if (view.status === "cancelled") notes.push({ text: `La renovación está detenida. ${currentSubscription?.accessUntil && dateTime(currentSubscription.accessUntil) ? `Tu acceso termina el ${dateTime(currentSubscription.accessUntil)}.` : "El periodo de acceso terminó."}` });
  if (currentSubscription?.pendingChange) notes.push({ text: `Cambio a ${PLAN_LABELS[currentSubscription.pendingChange.plan]} programado para ${dateTime(currentSubscription.pendingChange.effectiveAt)}.` });
  if (!view.canManage) notes.push({ text: "Solo el dueño del restaurante puede cambiar o cancelar esta suscripción.", tone: "dim" });
  if (view.canManage && view.source === "provider" && !view.actions.canChangePlan && !view.actions.canCancel && ["active", "trialing", "past_due"].includes(view.status)) notes.push({ text: "Hay una operación en curso o este estado no admite cambios por ahora.", tone: "dim" });
  if (view.canManage && view.source === "provider" && ["cancelled", "suspended", "past_due"].includes(view.status)) notes.push({ text: "No hay una acción de reactivación o actualización de tarjeta disponible en el contrato actual.", tone: "dim" });
  if (view.canManage && view.source === "provider" && currentSubscription?.pendingChange) notes.push({ text: "La bajada detuvo la renovación actual. Puedes cancelar para quitar el cambio programado y terminar la suscripción.", tone: "dim" });

  return <div className="lbd-sb">
    <div className="lbd-sb-head">
      <div>
        <span className="lbd-mono lbd-sb-eyebrow">PLAN Y COBRO · {restaurantName.toUpperCase()}</span>
        <strong className="lbd-display lbd-sb-plan">Plan {PLAN_LABELS[currentPlan]}</strong>
        {view.source === "manual"
          ? <span className="lbd-sb-price">Plan y condiciones administrados por FoodFlow.</span>
          : subscriptionPrice
            ? <span className="lbd-sb-price">{money(subscriptionPrice.netCents)} + {money(subscriptionPrice.igvCents)} IGV = {money(subscriptionPrice.grossCents)} {subscriptionPrice.currency}/mes</span>
            : currentPrice && view.source === "none"
              ? <span className="lbd-sb-price">{money(currentPrice.netCents)} + IGV / mes al contratar</span>
              : null}
      </div>
      <BillingStatusBadge status={view.status} />
    </div>

    <div className="lbd-sb-grid">
      <div className="lbd-sb-main">
        <div className="lbd-sb-state">
          <div>
            <span>{view.source === "manual" ? "Concesión manual" : BILLING_LABEL[view.status]}</span>
            {view.source === "provider" && nextDate && dateTime(nextDate) && <strong className="lbd-display">{whenLabel}: {dateTime(nextDate)}</strong>}
          </div>
          {trialDay && <div className="lbd-sb-trial">
            <span className="lbd-sb-trial-bar" aria-hidden="true"><span style={{ width: `${Math.round((trialDay / trialLength) * 100)}%` }} /></span>
            <small>Día {trialDay} de {trialLength} de la prueba</small>
          </div>}
        </div>

        {notes.length > 0 && <ul className="lbd-sb-notes">
          {notes.map((note) => <li key={note.text} data-tone={note.tone}>{note.text}</li>)}
        </ul>}

        {(currentSubscription?.card.last4 || currentSubscription?.lastPayment) && <dl className="lbd-sb-tiles">
          {currentSubscription?.card.last4 && <div><dt>Medio de pago</dt><dd>{currentSubscription.card.brand ?? "Tarjeta"} terminada en {currentSubscription.card.last4}</dd></div>}
          {currentSubscription?.lastPayment && <div data-failed={currentSubscription.lastPayment.status === "failed" || undefined}><dt>Último pago</dt><dd>{currentSubscription.lastPayment.status === "succeeded" ? "Exitoso" : currentSubscription.lastPayment.status === "failed" ? "Fallido" : "Reembolsado"} · {money(currentSubscription.lastPayment.grossCents)} · {dateTime(currentSubscription.lastPayment.at)}{currentSubscription.lastPayment.failureCode ? ` · ${currentSubscription.lastPayment.failureCode}` : ""}</dd></div>}
        </dl>}

        {view.canManage && view.source === "manual" && <div className="lbd-sb-block"><p className="lbd-sb-hint">Los cambios de una concesión manual los gestiona el equipo de FoodFlow.</p><PlanManagementButton currentPlan={currentPlan} splitActions /></div>}
        {view.canManage && view.source === "none" && !view.checkoutEnabled && <div className="lbd-sb-block"><p className="lbd-sb-hint">El pago con tarjeta todavía no está disponible. Puedes coordinar por WhatsApp.</p><PlanManagementButton currentPlan={currentPlan} splitActions /></div>}

        {view.canManage && view.source === "provider" && view.actions.canChangePlan && !changePreview && <div className="lbd-sb-block">
          <span className="lbd-sb-label">Cambiar a</span>
          <div className="lbd-sb-plans" role="group" aria-label="Plan">
            {PLANS.map((item) => item === currentPlan
              ? <button key={item} type="button" disabled className="is-current">{PLAN_LABELS[item]}<small>tu plan</small></button>
              : <button key={item} type="button" aria-pressed={targetPlan === item} className={targetPlan === item ? "is-on" : undefined} disabled={pending} onClick={() => setTargetPlan(item)}>{PLAN_LABELS[item]}<small>{money(view.offers.find((offer) => offer.plan === item)?.price.netCents ?? 0)} + IGV</small></button>)}
          </div>
          <div className="lbd-sb-actions">
            <button type="button" disabled={pending || !targetPlan} onClick={() => { if (targetPlan) void loadChangePreview(targetPlan); }} className="lbd-btn lbd-btn--solid">Revisar cambio</button>
            {view.actions.canCancel && <button type="button" onClick={() => { setCancelDialog(true); setError(""); }} disabled={pending} className="lbd-btn lbd-btn--ghost">Cancelar renovación</button>}
          </div>
        </div>}
        {view.canManage && view.actions.canCancel && !(view.source === "provider" && view.actions.canChangePlan && !changePreview) && <button type="button" onClick={() => { setCancelDialog(true); setError(""); }} disabled={pending} className="lbd-btn lbd-btn--ghost lbd-sb-cancel">Cancelar renovación</button>}

        {changePreview && <section className="lbd-sb-preview" data-up={changePreview.direction === "upgrade" || undefined} aria-labelledby="plan-change-preview-title">
          <h4 id="plan-change-preview-title" className="lbd-display">Revisa el cambio a {PLAN_LABELS[changePreview.targetPlan]}</h4>
          <p>{changePreview.direction === "upgrade" ? `La subida entra en vigor cuando se confirme el cargo (${dateTime(changePreview.effectiveAt)} como referencia).` : `La bajada está programada para ${dateTime(changePreview.effectiveAt)}.`}</p>
          <div className="lbd-sb-preview-tiles">
            <div><span>Nuevo precio</span><strong className="lbd-display">{money(changePreview.newPrice.grossCents)}<small> {changePreview.newPrice.currency}/mes</small></strong><small>{money(changePreview.newPrice.netCents)} netos + {money(changePreview.newPrice.igvCents)} IGV</small></div>
            {changePreview.chargeNow && <div className="is-accent"><span>Cargo al confirmar</span><strong className="lbd-display">{money(changePreview.chargeNow.grossCents)}<small> {changePreview.chargeNow.currency}</small></strong><small>Sin prorrateo: se cobra el mes completo.</small></div>}
          </div>
          {changePreview.endsTrial && <p className="lbd-sb-hint">Este cambio termina el periodo de prueba y genera un cargo ahora.</p>}
          {changePreview.irreversible && <p className="lbd-sb-hint">La bajada detendrá la renovación actual de inmediato y no se puede deshacer desde el panel.</p>}
          {changePreview.losesFeatures.length > 0 && <div className="lbd-sb-loses"><span>Al cambiar se pierden estas funciones:</span><div>{changePreview.losesFeatures.map((feature) => <s key={feature}>{FEATURE_LABELS[feature]}</s>)}</div></div>}
          {changePreview.blockers.map((blocker) => <p key={blocker.code} className="lbd-modal-error" role="alert">El plan permite hasta {blocker.max} {blocker.max === 1 ? "usuario" : "usuarios"} y ahora hay {blocker.current}. Quita usuarios de <Link href="/dashboard/app/equipo">Equipo</Link> antes de bajar.</p>)}
          {error && <p className="lbd-modal-error" role="alert">{error}</p>}
          <div className="lbd-sb-actions">
            <button type="button" onClick={() => void confirmChange()} disabled={pending || changePreview.blockers.length > 0} className="lbd-btn lbd-btn--solid">{pending ? "Procesando…" : changePreview.direction === "upgrade" ? "Confirmar y cobrar" : "Confirmar bajada"}</button>
            <button type="button" onClick={() => { setChangePreview(null); changeKeyRef.current = null; setError(""); }} disabled={pending} className="lbd-btn lbd-btn--ghost">Volver</button>
          </div>
        </section>}

        {view.canManage && view.source === "none" && view.checkoutEnabled && !checkout && !view.openCheckout && <form onSubmit={createCheckout} className="lbd-sb-form">
          <div className="lbd-sb-step"><i className="lbd-mono">1</i>Datos del titular<small>Paso 1 de 2</small></div>
          <div className="lbd-sb-plans" role="group" aria-label="Plan">
            {view.offers.map((offer) => <button key={offer.plan} type="button" aria-pressed={plan === offer.plan} className={plan === offer.plan ? "is-on" : undefined} onClick={() => setPlan(offer.plan)}>{PLAN_LABELS[offer.plan]}<small>{money(offer.price.netCents)} + IGV / mes</small></button>)}
          </div>
          {selectedOffer && <div className="lbd-sb-breakdown"><p>{money(selectedOffer.price.netCents)} netos + {money(selectedOffer.price.igvCents)} IGV ({selectedOffer.price.igvRateBps / 100}%) = <strong>{money(selectedOffer.price.grossCents)} {selectedOffer.price.currency}/mes</strong></p><small>{selectedOffer.trialDays > 0 ? `${selectedOffer.trialDays} días de prueba; se solicitará una tarjeta y luego empezarán los cobros mensuales.` : "Cobro mensual con tarjeta."}</small></div>}
          <div className="lbd-sb-fields">
            <label>Nombres<input className="lbd-input" required minLength={2} maxLength={50} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" /></label>
            <label>Apellidos<input className="lbd-input" required minLength={2} maxLength={50} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" /></label>
            <label>Celular<input className="lbd-input" required inputMode="tel" placeholder="987 654 321" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
            <label>Dirección<input className="lbd-input" required minLength={5} maxLength={100} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></label>
            <label>Ciudad<input className="lbd-input" required minLength={2} maxLength={30} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /></label>
            <div className="lbd-sb-doc"><span>Comprobante</span><div className="lbd-seg" role="group" aria-label="Comprobante">{(["boleta", "factura"] as const).map((kind) => <button key={kind} type="button" aria-pressed={documentKind === kind} className={documentKind === kind ? "is-on" : undefined} onClick={() => setDocumentKind(kind)}>{kind === "boleta" ? "Boleta" : "Factura"}</button>)}</div></div>
            {documentKind === "factura" && <>
              <label>RUC<input className="lbd-input" required inputMode="numeric" minLength={11} maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value)} /></label>
              <label>Razón social<input className="lbd-input" required minLength={3} maxLength={120} value={legalName} onChange={(e) => setLegalName(e.target.value)} /></label>
            </>}
          </div>
          <label className="lbd-sb-terms" data-on={terms || undefined}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required /><span>Acepto la suscripción mensual, el precio y el IGV indicados. Autorizo los cobros recurrentes a la tarjeta que registre en Culqi; puedo solicitar la cancelación.</span></label>
          {error && <p className="lbd-modal-error" role="alert">{error}</p>}
          <button type="submit" disabled={pending || !selectedOffer} className="lbd-btn lbd-btn--solid">{pending ? "Preparando checkout…" : "Continuar al pago seguro"}</button>
        </form>}

        {view.canManage && view.source === "none" && view.checkoutEnabled && checkout && <div className="lbd-sb-card">
          <div className="lbd-sb-step"><i className="lbd-mono">2</i>Tarjeta<small>Paso 2 de 2</small></div>
          <strong className="lbd-display">{PLAN_LABELS[checkout.plan]} · {money(checkout.price.grossCents)} PEN al mes, incluido IGV</strong>
          {checkout.trialDays > 0 && <p>Prueba de {checkout.trialDays} días; luego se iniciarán los cobros recurrentes.</p>}
          <p className="lbd-sb-lock"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0" /></svg>La tarjeta se ingresa en Culqi. FoodFlow no recibe el número de tarjeta.</p>
          <button type="button" onClick={() => void startCardCheckout()} disabled={pending} className="lbd-btn lbd-btn--solid">{pending ? "Conectando…" : "Ingresar tarjeta en Culqi"}</button>
          <button type="button" onClick={() => { setCheckout(null); setCheckoutStatus(null); setMessage(""); setError(""); }} className="lbd-sb-back">Volver a los datos del titular</button>
        </div>}

        {(statusText || message) && <div className="lbd-sb-status" aria-live="polite" data-failed={checkoutStatus?.status === "failed" || undefined}><strong>{statusText || "Actualización de suscripción"}</strong><p>{message || (checkoutStatus?.status === "processing" ? "Estamos verificando el resultado. El panel consultará el estado automáticamente." : `Estado consultado: ${checkoutStatus?.status}.`)}</p>{checkoutStatus?.status === "failed" && <p>{checkoutStatus.failureCode === "card_declined" ? "El cargo fue rechazado. Tu plan actual se conserva." : "El cambio no se completó. Tu plan actual se conserva."}</p>}</div>}
        {error && !changePreview && !(view.canManage && view.source === "none" && view.checkoutEnabled && !checkout && !view.openCheckout) && <p className="lbd-modal-error" role="alert">{error}</p>}
        {view.canManage && whatsapp && (view.source === "manual" || !view.checkoutEnabled || ["past_due", "suspended", "cancelled"].includes(view.status) || error.length > 0 || checkoutStatus?.status === "failed" || checkoutStatus?.status === "expired") && <a href={whatsapp} target="_blank" rel="noreferrer" className="lbd-btn lbd-btn--ghost lbd-sb-wa">Contactar al equipo por WhatsApp</a>}
      </div>

      <aside className="lbd-sb-aside" aria-label={`Qué incluye el plan ${PLAN_LABELS[shownPlan]}`}>
        <span className="lbd-mono">QUÉ INCLUYE {PLAN_LABELS[shownPlan].toUpperCase()}</span>
        <ul>
          {ALL_FEATURES.map((feature) => {
            const has = PLAN_FEATURES[shownPlan].includes(feature);
            return <li key={feature} data-on={has || undefined}><i aria-hidden="true">{has ? "✓" : "–"}</i>{FEATURE_LABELS[feature]}</li>;
          })}
        </ul>
        <small>{seats === Infinity ? "Usuarios sin límite." : seats === 1 ? "1 usuario: solo el dueño." : `Hasta ${seats} usuarios, dueño incluido.`}</small>
        <Link href="/precios" className="lbd-sb-compare">Comparar planes ›</Link>
      </aside>
    </div>

    {cancelDialog && host && createPortal(<div role="presentation" className="lbd-ad-scrim lbd-sb-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setCancelDialog(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" className="lbd-sb-dialog">
        <h4 id="cancel-subscription-title" className="lbd-display">¿Cancelar la renovación?</h4>
        <p>{currentSubscription?.pendingChange ? `También se quitará la bajada a ${PLAN_LABELS[currentSubscription.pendingChange.plan]} programada para ${dateTime(currentSubscription.pendingChange.effectiveAt)}. ` : "La renovación se detendrá en Culqi. "}{currentSubscription?.accessUntil && dateTime(currentSubscription.accessUntil) ? `Conservarás el acceso hasta ${dateTime(currentSubscription.accessUntil)}.` : "Se calculará si queda un periodo de acceso vigente."} Esta acción no borra los datos del restaurante.</p>
        <label>Motivo (opcional)<select className="lbd-input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value as keyof typeof CANCEL_REASON_LABEL)}>{Object.entries(CANCEL_REASON_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {error && <p className="lbd-modal-error" role="alert">{error}</p>}
        <div className="lbd-sb-actions"><button type="button" onClick={() => setCancelDialog(false)} disabled={pending} className="lbd-btn lbd-btn--cream">Conservar suscripción</button><button type="button" onClick={() => void confirmCancel()} disabled={pending} className="lbd-btn lbd-btn--ghost lbd-sb-danger">{pending ? "Cancelando…" : "Confirmar cancelación"}</button></div>
      </section>
    </div>, host)}
  </div>;
}
