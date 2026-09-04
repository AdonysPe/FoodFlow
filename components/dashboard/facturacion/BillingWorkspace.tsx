"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  saveBillingSettings,
  testOseConnection,
  type BillingSettingsInput,
} from "@/lib/actions/billing";
import { OSE_PROVIDERS, OSE_PROVIDER_META, isOseProvider } from "@/lib/billing/providers";
import {
  billingChecklist,
  billingReadiness,
  type BillingSettingsDTO,
  type CertificateStatusDTO,
  type ChecklistItem,
  type OseStatusDTO,
} from "@/lib/billing/settings";
import {
  checkApiKey,
  checkCounter,
  checkEmail,
  checkEndpoint,
  checkPhone,
  checkRequired,
  checkRuc,
  checkSeries,
  formatElectronicNo,
} from "@/lib/billing/validation";
import { PAPER_LABELS, PAPER_WIDTHS, formatDocumentNo } from "@/lib/receipt";
import { fieldClass, labelClass } from "@/components/dashboard/menu/ui";
import CertificateCard from "./CertificateCard";
import StatusCard from "./StatusCard";
import TicketPreviewModal from "./TicketPreviewModal";
import { Callout, Help, Section, SecretField, TextField, Toggle } from "./ui";

type SectionKey = "identity" | "certificate" | "ose" | "series" | "ticket";

const SECTION_FOR_CHECK: Record<ChecklistItem["key"], SectionKey> = {
  identity: "identity",
  certificate: "certificate",
  ose: "ose",
  series: "series",
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// What a thermal head can actually resolve. Anything wider is stored bytes the
// printer throws away, so the browser downscales before the upload.
const LOGO_MAX_PX = 384;

export default function BillingWorkspace({
  venueName,
  initial,
  cert,
  ose,
  apiKeyHint,
  secretHint,
  notaVentaSeries,
  notaVentaNext,
  issuedThisMonth,
}: {
  venueName: string;
  initial: BillingSettingsDTO;
  cert: CertificateStatusDTO;
  ose: OseStatusDTO;
  apiKeyHint: string | null;
  secretHint: string | null;
  notaVentaSeries: string;
  notaVentaNext: number;
  issuedThisMonth: number;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [value, setValue] = useState<BillingSettingsDTO>(initial);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    // Whatever is still missing is what opens first.
    identity: true,
    certificate: false,
    ose: false,
    series: false,
    ticket: false,
  });

  // Typed-over secrets. Empty means "keep whatever is stored".
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [clearApiSecret, setClearApiSecret] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({});

  function set<K extends keyof BillingSettingsDTO>(key: K, v: BillingSettingsDTO[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  const dirty = useMemo(
    () =>
      JSON.stringify(value) !== JSON.stringify(initial) ||
      apiKey !== "" ||
      apiSecret !== "" ||
      clearApiKey ||
      clearApiSecret,
    [value, initial, apiKey, apiSecret, clearApiKey, clearApiSecret]
  );

  // The checklist reflects what is on screen, not what was last saved: an owner
  // who just typed a valid RUC should see that line go green before saving.
  const items = useMemo(
    () =>
      billingChecklist(
        value,
        cert,
        {
          ...ose,
          hasApiKey: clearApiKey ? apiKey.length > 0 : ose.hasApiKey || apiKey.length > 0,
          hasSecret: clearApiSecret ? apiSecret.length > 0 : ose.hasSecret || apiSecret.length > 0,
        }
      ),
    [value, cert, ose, apiKey, apiSecret, clearApiKey, clearApiSecret]
  );
  const readiness = billingReadiness(items);

  const provider = isOseProvider(value.oseProvider) ? value.oseProvider : null;
  const providerMeta = provider ? OSE_PROVIDER_META[provider] : null;

  function jump(key: ChecklistItem["key"]) {
    const target = SECTION_FOR_CHECK[key];
    setOpen((prev) => ({ ...prev, [target]: true }));
    requestAnimationFrame(() => {
      sectionRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function toggle(key: SectionKey) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    setError(null);
    const payload: BillingSettingsInput = {
      ruc: value.ruc,
      legalName: value.legalName,
      tradeName: value.tradeName,
      address: value.address,
      phone: value.phone,
      sunatEmail: value.sunatEmail,
      oseProvider: value.oseProvider,
      oseEndpoint: value.oseEndpoint,
      apiKey,
      apiSecret,
      clearApiKey,
      clearApiSecret,
      boletaSeries: value.boletaSeries,
      boletaNext: value.boletaNext,
      facturaSeries: value.facturaSeries,
      facturaNext: value.facturaNext,
      creditSeries: value.creditSeries,
      creditNext: value.creditNext,
      logoDataUrl: value.logoDataUrl,
      footerNote: value.footerNote,
      showQr: value.showQr,
      showCustomerRuc: value.showCustomerRuc,
      paperWidth: value.paperWidth,
      showIgv: value.showIgv,
      autoPrint: value.autoPrint,
    };

    startSaving(async () => {
      const result = await saveBillingSettings(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApiKey("");
      setApiSecret("");
      setClearApiKey(false);
      setClearApiSecret(false);
      pushToast("Facturación actualizada.", "success");
      router.refresh();
    });
  }

  function test() {
    setTestResult(null);
    startTesting(async () => {
      const result = await testOseConnection();
      if (!result.ok) {
        setTestResult({ passed: false, message: result.error });
        return;
      }
      setTestResult(result.data);
    });
  }

  async function pickLogo(file: File | null) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError("El logo debe ser PNG, JPG o WebP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("El logo no puede pesar más de 2 MB.");
      return;
    }
    setError(null);
    set("logoDataUrl", await downscaleToDataUrl(file));
  }

  return (
    <div className="flex flex-col gap-5">
      <StatusCard
        readiness={readiness}
        items={items}
        updatedAt={value.updatedAt}
        issuedThisMonth={issuedThisMonth}
        nextDocument={formatElectronicNo(value.boletaSeries, value.boletaNext)}
        onJump={jump}
      />

      {/* ============================================ 1 · datos del restaurante */}
      <div ref={(el) => void (sectionRefs.current.identity = el)}>
        <Section
          title="1 · Datos del restaurante"
          summary="El contribuyente que emite. Es lo que SUNAT lee en cada comprobante."
          status={items[0].done ? "done" : "pending"}
          open={open.identity}
          onToggle={() => toggle("identity")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="bl-ruc"
              label="RUC"
              required
              value={value.ruc}
              onChange={(v) => set("ruc", v)}
              check={(v) => checkRuc(v)}
              digitsOnly
              maxLength={11}
              inputMode="numeric"
              mono
              placeholder="20123456789"
              hint="11 dígitos. Verificamos el dígito de control al escribir."
            />
            <TextField
              id="bl-legal"
              label="Razón social"
              required
              value={value.legalName}
              onChange={(v) => set("legalName", v)}
              check={(v) => checkRequired(v, "La razón social")}
              maxLength={160}
              placeholder="Inversiones El Sabor S.A.C."
              hint="Tal como figura en tu ficha RUC."
            />
            <TextField
              id="bl-trade"
              label="Nombre comercial"
              value={value.tradeName}
              onChange={(v) => set("tradeName", v)}
              maxLength={120}
              placeholder={venueName}
              hint={`Si lo dejas vacío usamos «${venueName}».`}
            />
            <TextField
              id="bl-phone"
              label="Teléfono"
              value={value.phone}
              onChange={(v) => set("phone", v)}
              check={(v) => checkPhone(v)}
              maxLength={40}
              inputMode="tel"
              placeholder="(01) 555 1234"
            />
            <TextField
              id="bl-address"
              label="Dirección fiscal"
              required
              className="sm:col-span-2"
              value={value.address}
              onChange={(v) => set("address", v)}
              check={(v) => checkRequired(v, "La dirección fiscal")}
              maxLength={200}
              placeholder="Av. La Mar 1234, Miraflores, Lima"
              hint="La del domicilio fiscal declarado, no la del local si son distintas."
            />
            <TextField
              id="bl-email"
              label="Correo de notificación SUNAT"
              required
              className="sm:col-span-2"
              value={value.sunatEmail}
              onChange={(v) => set("sunatEmail", v)}
              check={(v) => checkEmail(v, { required: true })}
              maxLength={160}
              inputMode="email"
              placeholder="contabilidad@turestaurante.pe"
              hint="Ahí llegan las observaciones y los avisos de tu OSE. Revísalo seguido."
            />
          </div>
        </Section>
      </div>

      {/* ==================================================== 2 · certificado */}
      <div ref={(el) => void (sectionRefs.current.certificate = el)}>
        <Section
          title="2 · Certificado digital"
          summary="El .pfx que firma tus comprobantes. Lo obtienes gratis en SUNAT con tu RUC."
          status={items[1].done ? "done" : "pending"}
          open={open.certificate}
          onToggle={() => toggle("certificate")}
        >
          <CertificateCard cert={cert} onChanged={() => router.refresh()} />
        </Section>
      </div>

      {/* =========================================================== 3 · OSE */}
      <div ref={(el) => void (sectionRefs.current.ose = el)}>
        <Section
          title="3 · Conexión con tu OSE"
          summary="Tu cuenta con el operador que envía los comprobantes a SUNAT."
          status={items[2].done ? "done" : "pending"}
          open={open.ose}
          onToggle={() => toggle("ose")}
        >
          <div className="flex flex-col gap-4">
            <Callout tone="warn" title="¿Todavía no tienes cuenta en un OSE?">
              Contrata la tuya directamente con el proveedor: la cuenta y el pago mensual
              son del restaurante, no de FoodFlow. Nubefact publica planes desde S/70 al
              mes y Facturador.pro es otra opción conocida en Perú; confirma el precio
              vigente con ellos antes de contratar.
            </Callout>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bl-provider" className={labelClass}>
                  Proveedor OSE <span className="text-accent-label">*</span>
                  <Help text="El OSE (u OSE/PSE) es quien valida y envía tus comprobantes a SUNAT. Debes tener una cuenta contratada con uno." />
                </label>
                <select
                  id="bl-provider"
                  value={value.oseProvider}
                  onChange={(e) => set("oseProvider", e.target.value as BillingSettingsDTO["oseProvider"])}
                  className={fieldClass}
                >
                  <option value="">Elige tu proveedor…</option>
                  {OSE_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {OSE_PROVIDER_META[p].label}
                    </option>
                  ))}
                </select>
                {providerMeta?.site && (
                  <p className="mt-1.5 text-[11.5px] text-fg/35">
                    <a
                      href={providerMeta.site}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2 hover:text-fg/60"
                    >
                      Abrir {providerMeta.label}
                    </a>
                  </p>
                )}
              </div>

              {providerMeta?.needsEndpoint && (
                <TextField
                  id="bl-endpoint"
                  label="URL de tu cuenta en el OSE"
                  required
                  value={value.oseEndpoint}
                  onChange={(v) => set("oseEndpoint", v)}
                  check={(v) => checkEndpoint(v)}
                  maxLength={300}
                  inputMode="url"
                  mono
                  placeholder="https://api.nubefact.com/api/v1/…"
                  hint="Debe empezar con https. Tu proveedor te la da junto con la credencial."
                />
              )}
            </div>

            <SecretField
              id="bl-apikey"
              label="API Key del OSE"
              required
              value={apiKey}
              onChange={(v) => {
                setApiKey(v);
                setClearApiKey(false);
              }}
              storedHint={clearApiKey ? null : apiKeyHint}
              onClear={() => setClearApiKey(true)}
              check={(v) => checkApiKey(v)}
              placeholder="Pega aquí tu credencial"
              hint={
                providerMeta?.credentialHint ??
                "Se guarda cifrada. Tú eres responsable del pago directo al proveedor."
              }
            />

            {providerMeta?.needsSecret && (
              <SecretField
                id="bl-apisecret"
                label="API Secret"
                value={apiSecret}
                onChange={(v) => {
                  setApiSecret(v);
                  setClearApiSecret(false);
                }}
                storedHint={clearApiSecret ? null : secretHint}
                onClear={() => setClearApiSecret(true)}
                check={(v) => checkApiKey(v, { required: false })}
                hint="Solo si tu proveedor entrega clave y secreto por separado."
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={test}
                disabled={isTesting || dirty}
                className="rounded-xl border border-fg/[0.12] bg-fg/[0.05] px-4 py-2.5 text-[13.5px] font-medium text-fg/75 transition-colors hover:bg-fg/[0.09] disabled:opacity-40"
              >
                {isTesting ? "Probando…" : "Probar conexión"}
              </button>
              {dirty && (
                <p className="text-[12px] text-fg/35">
                  Guarda los cambios antes de probar.
                </p>
              )}
            </div>

            {testResult && (
              <Callout tone={testResult.passed ? "ok" : "danger"}>{testResult.message}</Callout>
            )}
            {!testResult && ose.lastTestMessage && (
              <Callout tone={ose.lastTestOk ? "ok" : "danger"}>{ose.lastTestMessage}</Callout>
            )}
          </div>
        </Section>
      </div>

      {/* ======================================================== 4 · series */}
      <div ref={(el) => void (sectionRefs.current.series = el)}>
        <Section
          title="4 · Series y numeración"
          summary="Cómo se numeran tus boletas, facturas y notas de crédito."
          status={items[3].done ? "done" : "pending"}
          open={open.series}
          onToggle={() => toggle("series")}
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <SeriesPair
                idPrefix="bl-boleta"
                label="Boletas"
                kind="boleta"
                series={value.boletaSeries}
                next={value.boletaNext}
                onSeries={(v) => set("boletaSeries", v)}
                onNext={(v) => set("boletaNext", v)}
              />
              <SeriesPair
                idPrefix="bl-factura"
                label="Facturas"
                kind="factura"
                series={value.facturaSeries}
                next={value.facturaNext}
                onSeries={(v) => set("facturaSeries", v)}
                onNext={(v) => set("facturaNext", v)}
              />
              <SeriesPair
                idPrefix="bl-nc"
                label="Notas de crédito"
                kind="credit"
                series={value.creditSeries}
                next={value.creditNext}
                onSeries={(v) => set("creditSeries", v)}
                onNext={(v) => set("creditNext", v)}
              />
            </div>

            <Callout tone="info">
              El correlativo solo avanza: si escribes uno menor al ya emitido, lo dejamos
              como está. Repetir un número hace que SUNAT rechace el comprobante.
              <br />
              Tu nota de venta interna sigue numerándose aparte, en{" "}
              <span className="font-mono text-fg/70">
                {formatDocumentNo(notaVentaSeries, notaVentaNext)}
              </span>
              .
            </Callout>
          </div>
        </Section>
      </div>

      {/* ======================================================== 5 · ticket */}
      <div ref={(el) => void (sectionRefs.current.ticket = el)}>
        <Section
          title="5 · Personalización del ticket"
          summary="Logo, mensaje al pie y cómo sale impreso en tu ticketera."
          status="optional"
          open={open.ticket}
          onToggle={() => toggle("ticket")}
        >
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Logo del restaurante</span>
                <div className="flex items-center gap-3">
                  {value.logoDataUrl ? (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-fg/[0.1] bg-white p-1">
                      {/* Data URL of the owner's own file: next/image would only
                          add a loader in front of bytes we already hold. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={value.logoDataUrl}
                        alt="Logo del restaurante"
                        className="max-h-full max-w-full object-contain"
                      />
                    </span>
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-fg/[0.15] text-[10px] text-fg/30">
                      sin logo
                    </span>
                  )}
                  <div className="min-w-0">
                    <input
                      id="bl-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => void pickLogo(e.target.files?.[0] ?? null)}
                      className="block w-full cursor-pointer rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2.5 py-2 text-[12px] text-fg/60 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-fg/[0.08] file:px-2 file:py-1 file:text-[12px] file:font-medium file:text-fg/80"
                    />
                    {value.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => set("logoDataUrl", null)}
                        className="mt-1.5 text-[11.5px] font-medium text-fg/40 underline underline-offset-2 hover:text-accent-label"
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-fg/35">
                  PNG o JPG, máx. 2 MB. Lo reducimos a {LOGO_MAX_PX} px y se imprime en
                  blanco y negro: un logo simple sale mucho mejor que uno con degradados.
                </p>
              </div>

              <TextField
                id="bl-footer"
                label="Mensaje al pie del ticket"
                value={value.footerNote}
                onChange={(v) => set("footerNote", v)}
                maxLength={200}
                placeholder="Gracias por su visita"
                hint="Si lo dejas vacío se imprime «¡Gracias por su visita!»."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={value.showQr}
                onChange={(v) => set("showQr", v)}
                title="Mostrar QR en el ticket"
                hint="Reserva el espacio del QR de SUNAT; se llena cuando el comprobante es aceptado."
              />
              <Toggle
                checked={value.showCustomerRuc}
                onChange={(v) => set("showCustomerRuc", v)}
                title="Mostrar documento del cliente"
                hint="En boletas y facturas siempre sale; esto lo agrega también al ticket interno."
              />
              <Toggle
                checked={value.autoPrint}
                onChange={(v) => set("autoPrint", v)}
                title="Imprimir al cobrar"
                hint="Al confirmar el pago se abre solo el diálogo de impresión."
              />
              <Toggle
                checked={value.showIgv}
                onChange={(v) => set("showIgv", v)}
                title="Desglosar IGV (18%)"
                hint={
                  value.ruc.trim()
                    ? "Se calcula desde el total, porque los precios de tu carta ya lo incluyen."
                    : "Necesitas registrar tu RUC para activarlo."
                }
                disabled={!value.ruc.trim()}
              />
            </div>

            <div>
              <span className={labelClass}>Ancho del papel</span>
              <div className="grid max-w-xs grid-cols-2 gap-2">
                {PAPER_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => set("paperWidth", w)}
                    aria-pressed={value.paperWidth === w}
                    className={`h-11 rounded-xl border text-[13px] font-semibold transition-colors ${
                      value.paperWidth === w
                        ? "border-accent-400/60 bg-accent-400/15 text-accent-label"
                        : "border-fg/[0.1] bg-fg/[0.04] text-fg/60 hover:text-fg/85"
                    }`}
                  >
                    {w} mm
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11.5px] text-fg/35">{PAPER_LABELS[value.paperWidth]}</p>
            </div>
          </div>
        </Section>
      </div>

      {error && <Callout tone="danger">{error}</Callout>}

      {/* ======================================================= las acciones */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2.5 border-t border-fg/[0.08] bg-ink-950/90 px-4 py-3.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={save}
          disabled={isSaving || !dirty}
          className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? "Guardando…" : "Guardar configuración"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(initial);
            setApiKey("");
            setApiSecret("");
            setClearApiKey(false);
            setClearApiSecret(false);
            setError(null);
          }}
          disabled={!dirty || isSaving}
          className="rounded-xl border border-fg/[0.12] bg-fg/[0.05] px-4 py-2.5 text-[13.5px] font-medium text-fg/70 transition-colors hover:bg-fg/[0.09] disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="rounded-xl border border-fg/[0.12] bg-fg/[0.05] px-4 py-2.5 text-[13.5px] font-medium text-fg/70 transition-colors hover:bg-fg/[0.09]"
        >
          Vista previa del ticket
        </button>
        {dirty && (
          <span className="text-[12px] text-fg/35">Tienes cambios sin guardar.</span>
        )}
      </div>

      {preview && (
        <TicketPreviewModal
          venueName={venueName}
          settings={value}
          notaVentaSeries={notaVentaSeries}
          notaVentaNext={notaVentaNext}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}

function SeriesPair({
  idPrefix,
  label,
  kind,
  series,
  next,
  onSeries,
  onNext,
}: {
  idPrefix: string;
  label: string;
  kind: "boleta" | "factura" | "credit";
  series: string;
  next: number;
  onSeries: (v: string) => void;
  onNext: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-fg/[0.08] bg-fg/[0.02] p-4">
      <p className="text-[13px] font-semibold text-fg/85">{label}</p>
      <div className="mt-3 flex flex-col gap-3">
        <TextField
          id={`${idPrefix}-series`}
          label="Serie"
          value={series}
          onChange={onSeries}
          check={(v) => checkSeries(v, kind)}
          uppercase
          mono
          maxLength={4}
        />
        <TextField
          id={`${idPrefix}-next`}
          label="Siguiente correlativo"
          value={String(next)}
          onChange={(v) => onNext(Number(v || 0))}
          check={(v) => checkCounter(v)}
          digitsOnly
          inputMode="numeric"
          maxLength={8}
        />
      </div>
      <p className="mt-2.5 rounded-lg bg-fg/[0.04] px-2.5 py-1.5 text-center font-mono text-[12px] text-fg/60">
        {formatElectronicNo(series, next)}
      </p>
    </div>
  );
}

/**
 * Shrinks the chosen image to what a ticketera can print before it ever leaves
 * the browser. A 2 MB photo becomes a few KB of PNG, which is what ends up in
 * the database and on every ticket.
 */
async function downscaleToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  // White ground: a transparent PNG prints as a black block on thermal paper.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
