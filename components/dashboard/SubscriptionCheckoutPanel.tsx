"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { FEATURE_LABELS, PLAN_LABELS, PLANS, type PlanValue } from "@/lib/plans";
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
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" }).format(date);
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
  const [changePreview, setChangePreview] = useState<PlanChangePreview | null>(null);
  const [targetPlan, setTargetPlan] = useState<PlanValue | "">("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState<keyof typeof CANCEL_REASON_LABEL>("other");
  const changeKeyRef = useRef<string | null>(null);
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
  if (loading) return <p className="mt-5 text-[13px] text-faint" aria-live="polite">Consultando las opciones de suscripción…</p>;
  if (!view) return <p className="mt-4 text-[13px] text-warn-ink" role="alert">{error || "No pudimos consultar el estado de la suscripción."}</p>;
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

  return <div className="mt-1">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Plan y cobro · {restaurantName}</p>
        <h3 className="mt-2 font-display text-[20px] font-bold text-fg">Plan {PLAN_LABELS[currentPlan]}</h3>
        {view.source === "manual"
          ? <p className="mt-1 text-[13px] text-muted">Plan y condiciones administrados por FoodFlow.</p>
          : subscriptionPrice
            ? <p className="mt-1 text-[13px] text-muted">{money(subscriptionPrice.netCents)} + {money(subscriptionPrice.igvCents)} IGV = {money(subscriptionPrice.grossCents)} {subscriptionPrice.currency}/mes</p>
            : currentPrice && view.source === "none"
              ? <p className="mt-1 text-[13px] text-muted">{money(currentPrice.netCents)} + IGV / mes al contratar</p>
              : null}
      </div>
      <BillingStatusBadge status={view.status} />
    </div>
    <div className="mt-4 rounded-xl border border-fg/[0.08] bg-fg/[0.025] p-4 text-[13px] text-fg/75">
      <p className="font-semibold text-fg">{view.source === "manual" ? "Concesión manual" : BILLING_LABEL[view.status]}</p>
      {view.source === "provider" && nextDate && <p className="mt-1">{whenLabel}: {dateTime(nextDate)}.</p>}
      {view.source === "provider" && view.status === "trialing" && currentSubscription?.trialEndsAt && <p className="mt-1">Después de la prueba comenzará el cobro mensual de la tarjeta registrada.</p>}
      {view.source === "provider" && currentSubscription?.cancelAtPeriodEnd && <p className="mt-1">La renovación está detenida; no se programarán nuevos cobros.</p>}
      {view.status === "past_due" && <p className="mt-1">El acceso puede continuar durante el periodo de gracia que muestra el backend. Revisa el último intento de cobro.</p>}
      {view.status === "suspended" && <p className="mt-1">El acceso a funciones de pago está suspendido. Contacta al equipo para revisar el estado.</p>}
      {view.status === "cancelled" && <p className="mt-1">La renovación está detenida. {currentSubscription?.accessUntil && dateTime(currentSubscription.accessUntil) ? `Tu acceso termina el ${dateTime(currentSubscription.accessUntil)}.` : "El periodo de acceso terminó."}</p>}
      {currentSubscription?.pendingChange && <p className="mt-2">Cambio a {PLAN_LABELS[currentSubscription.pendingChange.plan]} programado para {dateTime(currentSubscription.pendingChange.effectiveAt)}.</p>}
      {currentSubscription?.card.last4 && <p className="mt-2">Medio de pago: {currentSubscription.card.brand ?? "Tarjeta"} terminada en {currentSubscription.card.last4}.</p>}
      {currentSubscription?.lastPayment && <p className="mt-2">Último pago: {currentSubscription.lastPayment.status === "succeeded" ? "exitoso" : currentSubscription.lastPayment.status === "failed" ? "fallido" : "reembolsado"} · {money(currentSubscription.lastPayment.grossCents)} · {dateTime(currentSubscription.lastPayment.at)}{currentSubscription.lastPayment.failureCode ? ` · ${currentSubscription.lastPayment.failureCode}` : ""}.</p>}
    </div>
    {!view.canManage && <p className="mt-3 text-[13px] text-faint">Solo el dueño del restaurante puede cambiar o cancelar esta suscripción.</p>}
    {view.canManage && view.source === "manual" && <div className="mt-4"><p className="text-[13px] text-faint">Los cambios de una concesión manual los gestiona el equipo de FoodFlow.</p><PlanManagementButton currentPlan={currentPlan} className="mt-3 w-full" splitActions /></div>}
    {view.canManage && view.source === "none" && !view.checkoutEnabled && <div className="mt-4"><p className="text-[13px] text-faint">El pago con tarjeta todavía no está disponible. Puedes coordinar por WhatsApp.</p><PlanManagementButton currentPlan={currentPlan} className="mt-3 w-full" splitActions /></div>}
    {view.canManage && view.source === "provider" && view.actions.canChangePlan && !changePreview && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
      <label className="text-[12px] text-faint">Cambiar a<select className={`${inputClass} mt-1`} value={targetPlan} onChange={(event) => setTargetPlan(event.target.value as PlanValue | "")} disabled={pending}><option value="" disabled>Elige un plan</option>{PLANS.filter((item) => item !== currentPlan).map((item) => <option key={item} value={item}>{PLAN_LABELS[item]}</option>)}</select></label>
      <button type="button" disabled={pending || !targetPlan} onClick={() => { if (targetPlan) void loadChangePreview(targetPlan); }} className="self-end rounded-xl border border-fg/[0.12] px-4 py-3 text-[13px] font-semibold text-fg/80 disabled:opacity-50">Revisar cambio</button>
    </div>}
    {view.canManage && view.actions.canCancel && <button type="button" onClick={() => { setCancelDialog(true); setError(""); }} disabled={pending} className="mt-3 rounded-xl border border-warn/30 bg-warn/[0.06] px-4 py-2.5 text-[13px] font-semibold text-warn-ink disabled:opacity-50">Cancelar renovación</button>}
    {view.canManage && view.source === "provider" && !view.actions.canChangePlan && !view.actions.canCancel && ["active", "trialing", "past_due"].includes(view.status) && <p className="mt-3 text-[12.5px] text-faint">Hay una operación en curso o este estado no admite cambios por ahora.</p>}
    {view.canManage && view.source === "provider" && ["cancelled", "suspended", "past_due"].includes(view.status) && <p className="mt-3 text-[12.5px] text-faint">No hay una acción de reactivación o actualización de tarjeta disponible en el contrato actual.</p>}
    {view.canManage && view.source === "provider" && currentSubscription?.pendingChange && <p className="mt-3 text-[12.5px] text-faint">La bajada detuvo la renovación actual. Puedes cancelar para quitar el cambio programado y terminar la suscripción.</p>}
    {changePreview && <section className="mt-4 rounded-xl border border-accent-400/25 bg-accent-400/[0.05] p-4" aria-labelledby="plan-change-preview-title">
      <h4 id="plan-change-preview-title" className="text-[14px] font-semibold text-fg">Revisa el cambio a {PLAN_LABELS[changePreview.targetPlan]}</h4>
      <p className="mt-2 text-[13px] text-fg/80">{changePreview.direction === "upgrade" ? `La subida entra en vigor cuando se confirme el cargo (${dateTime(changePreview.effectiveAt)} como referencia).` : `La bajada está programada para ${dateTime(changePreview.effectiveAt)}.`}</p>
      <p className="mt-2 text-[13px] text-fg/80">Nuevo precio: {money(changePreview.newPrice.netCents)} netos + {money(changePreview.newPrice.igvCents)} IGV = <strong>{money(changePreview.newPrice.grossCents)} {changePreview.newPrice.currency}/mes</strong>.</p>
      {changePreview.chargeNow && <p className="mt-1 text-[13px] text-fg/80">Cargo al confirmar: <strong>{money(changePreview.chargeNow.grossCents)} {changePreview.chargeNow.currency}</strong>. El backend no aplica prorrateo.</p>}
      {changePreview.endsTrial && <p className="mt-2 rounded-lg bg-warn/[0.08] p-3 text-[12.5px] text-warn-ink">Este cambio termina el periodo de prueba y genera un cargo ahora.</p>}
      {changePreview.irreversible && <p className="mt-2 rounded-lg bg-warn/[0.08] p-3 text-[12.5px] text-warn-ink">La bajada detendrá la renovación actual de inmediato y no se puede deshacer desde el panel.</p>}
      {changePreview.losesFeatures.length > 0 && <div className="mt-2 text-[12.5px] text-fg/75"><p>Al cambiar se pierden estas funciones:</p><ul className="mt-1 list-inside list-disc">{changePreview.losesFeatures.map((feature) => <li key={feature}>{FEATURE_LABELS[feature]}</li>)}</ul></div>}
      {changePreview.blockers.map((blocker) => <p key={blocker.code} className="mt-2 rounded-lg bg-warn/[0.08] p-3 text-[12.5px] text-warn-ink" role="alert">El plan permite hasta {blocker.max} usuarios y ahora hay {blocker.current}. Quita usuarios de Equipo antes de bajar.</p>)}
      {error && <p className="mt-3 text-[13px] text-warn-ink" role="alert">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void confirmChange()} disabled={pending || changePreview.blockers.length > 0} className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-2.5 text-[13px] font-semibold text-on-accent disabled:opacity-50">{pending ? "Procesando…" : changePreview.direction === "upgrade" ? "Confirmar y cobrar" : "Confirmar bajada"}</button>
        <button type="button" onClick={() => { setChangePreview(null); changeKeyRef.current = null; setError(""); }} disabled={pending} className="rounded-xl border border-fg/[0.12] px-4 py-2.5 text-[13px] text-fg/75 disabled:opacity-50">Volver</button>
      </div>
    </section>}
    {view.canManage && view.source === "none" && view.checkoutEnabled && !checkout && !view.openCheckout && <form onSubmit={createCheckout} className="mt-4 grid gap-3 sm:grid-cols-2">
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
    {view.canManage && view.source === "none" && view.checkoutEnabled && checkout && <div className="mt-4 rounded-xl border border-fg/[0.09] bg-fg/[0.025] p-4">
      <p className="text-[13px] font-semibold text-fg">{PLAN_LABELS[checkout.plan]} · {money(checkout.price.grossCents)} PEN al mes, incluido IGV</p>
      {checkout.trialDays > 0 && <p className="mt-1 text-[12.5px] text-faint">Prueba de {checkout.trialDays} días; luego se iniciarán los cobros recurrentes.</p>}
      <p className="mt-2 text-[12.5px] text-faint">La tarjeta se ingresa en Culqi. FoodFlow no recibe el número de tarjeta.</p>
      <button type="button" onClick={() => void startCardCheckout()} disabled={pending} className="mt-4 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-3 text-[14px] font-semibold text-on-accent disabled:opacity-50">{pending ? "Conectando…" : "Ingresar tarjeta en Culqi"}</button>
      <button type="button" onClick={() => { setCheckout(null); setCheckoutStatus(null); setMessage(""); setError(""); }} className="mt-2 w-full rounded-xl border border-fg/[0.1] px-4 py-2.5 text-[13px] text-fg/75">Volver a los datos del titular</button>
    </div>}
    {(statusText || message) && <div className="mt-4 rounded-xl border border-accent-400/20 bg-accent-400/[0.06] p-4 text-[13px] text-fg/80" aria-live="polite"><p className="font-semibold">{statusText || "Actualización de suscripción"}</p><p className="mt-1">{message || (checkoutStatus?.status === "processing" ? "El backend está verificando el resultado. El panel consultará el estado automáticamente." : `Estado consultado: ${checkoutStatus?.status}.`)}</p>{checkoutStatus?.status === "failed" && <p className="mt-1">{checkoutStatus.failureCode === "card_declined" ? "El cargo fue rechazado. Tu plan actual se conserva." : "El cambio no se completó. Tu plan actual se conserva."}</p>}</div>}
    {error && <p className="mt-3 text-[13px] text-warn-ink" role="alert">{error}</p>}
    {view.canManage && whatsapp && (view.source === "manual" || !view.checkoutEnabled || ["past_due", "suspended", "cancelled"].includes(view.status) || error.length > 0 || checkoutStatus?.status === "failed" || checkoutStatus?.status === "expired") && <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[13px] font-semibold text-accent-label underline-offset-4 hover:underline">Contactar al equipo por WhatsApp</a>}
    {cancelDialog && <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" className="w-full max-w-md rounded-2xl border border-fg/[0.1] bg-ink-900 p-5 shadow-panel sm:p-6">
        <h4 id="cancel-subscription-title" className="font-display text-[19px] font-bold text-fg">Confirmar cancelación</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{currentSubscription?.pendingChange ? `También se quitará la bajada a ${PLAN_LABELS[currentSubscription.pendingChange.plan]} programada para ${dateTime(currentSubscription.pendingChange.effectiveAt)}. ` : "La renovación se detendrá en Culqi. "}{currentSubscription?.accessUntil && dateTime(currentSubscription.accessUntil) ? `Conservarás el acceso hasta ${dateTime(currentSubscription.accessUntil)}.` : "El backend determinará si queda un periodo de acceso vigente."} Esta acción no borra los datos del restaurante.</p>
        <label className="mt-4 block text-[12px] text-faint">Motivo (opcional)<select className={`${inputClass} mt-1`} value={cancelReason} onChange={(e) => setCancelReason(e.target.value as keyof typeof CANCEL_REASON_LABEL)}>{Object.entries(CANCEL_REASON_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {error && <p className="mt-3 text-[13px] text-warn-ink" role="alert">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setCancelDialog(false)} disabled={pending} className="rounded-xl border border-fg/[0.12] px-4 py-2.5 text-[13px] text-fg/75 disabled:opacity-50">Conservar suscripción</button><button type="button" onClick={() => void confirmCancel()} disabled={pending} className="rounded-xl bg-warn px-4 py-2.5 text-[13px] font-semibold text-on-accent disabled:opacity-50">{pending ? "Cancelando…" : "Confirmar cancelación"}</button></div>
      </section>
    </div>}
  </div>;
}
