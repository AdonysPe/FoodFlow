"use client";

import { useRef, useState, useTransition } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { removeCertificate, uploadCertificate } from "@/lib/actions/billing";
import {
  CERT_WARN_DAYS,
  certificateState,
  daysUntil,
  formatBillingDate,
  type CertificateStatusDTO,
} from "@/lib/billing/settings";
import { Callout, Field, Help } from "./ui";
import { fieldClass, labelClass } from "@/components/dashboard/menu/ui";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Sección 2 — el certificado digital.
 *
 * Uploads outside the main form on purpose: the file is the one thing here
 * that cannot be re-sent by pressing "Guardar" again, and the server has to
 * answer with something the owner needs immediately — whether the password
 * opened the container, and what date it expires.
 */
export default function CertificateCard({
  cert,
  onChanged,
}: {
  cert: CertificateStatusDTO;
  onChanged: () => void;
}) {
  const pushToast = useDashboardStore((s) => s.pushToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const state = certificateState(cert);
  const remaining = daysUntil(cert.expiresAt);

  function pick(selected: File | null) {
    setError(null);
    setWarning(null);
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!/\.(pfx|p12)$/i.test(selected.name)) {
      setFile(null);
      setFileError("El certificado de SUNAT es un archivo .pfx o .p12.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setFile(null);
      setFileError("Ese archivo pesa más de 5 MB; no es un certificado.");
      return;
    }
    setFileError(null);
    setFile(selected);
  }

  function submit() {
    if (!file || !password) return;
    setError(null);
    setWarning(null);
    start(async () => {
      const dataBase64 = await toBase64(file);
      const result = await uploadCertificate({
        fileName: file.name,
        dataBase64,
        password,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFile(null);
      setPassword("");
      if (inputRef.current) inputRef.current.value = "";
      setWarning(result.data.warning);
      pushToast("Certificado guardado y cifrado.", "success");
      onChanged();
    });
  }

  function drop() {
    start(async () => {
      const result = await removeCertificate();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      pushToast("Certificado eliminado.", "success");
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------ what is on file */}
      <div
        className={`rounded-xl border px-4 py-3.5 ${
          state === "valid"
            ? "border-ok/30 bg-ok/[0.07]"
            : state === "expiring"
              ? "border-warn/30 bg-warn/[0.07]"
              : state === "expired"
                ? "border-accent-400/35 bg-accent-400/[0.08]"
                : "border-fg/[0.1] bg-fg/[0.03]"
        }`}
      >
        {state === "none" ? (
          <p className="text-[13px] font-medium text-muted">
            No has subido tu certificado.
          </p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-fg">
              {state === "expired"
                ? "Tu certificado venció"
                : state === "unknown"
                  ? "Certificado guardado"
                  : `Certificado válido hasta ${formatBillingDate(cert.expiresAt)}`}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-faint">
              {[cert.fileName, cert.subject].filter(Boolean).join(" · ")}
              {state === "expiring" && remaining != null && (
                <>
                  {" · "}
                  <span className="text-warn-ink">
                    vence en {remaining} {remaining === 1 ? "día" : "días"}
                  </span>
                </>
              )}
              {state === "unknown" &&
                " · no pudimos leer su fecha de vencimiento, revísala con tu proveedor."}
            </p>
            <button
              type="button"
              onClick={drop}
              disabled={isPending}
              className="mt-2 text-[12px] font-medium text-faint underline underline-offset-2 hover:text-accent-label disabled:opacity-40"
            >
              Eliminar certificado
            </button>
          </>
        )}
      </div>

      {state === "expiring" && (
        <Callout tone="warn" title="Renueva antes de que venza">
          Un certificado vencido hace que SUNAT rechace cada comprobante. Renuévalo en
          SUNAT y vuelve a subirlo aquí; te avisamos {CERT_WARN_DAYS} días antes.
        </Callout>
      )}

      {/* ------------------------------------------------------------- upload */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          htmlFor="cert-file"
          label={cert.fileName ? "Reemplazar certificado" : "Certificado digital"}
          required={!cert.fileName}
          error={fileError}
          hint="Archivo .pfx o .p12, máximo 5 MB."
        >
          <input
            ref={inputRef}
            id="cert-file"
            type="file"
            accept=".pfx,.p12,application/x-pkcs12"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-3 py-2.5 text-[12.5px] text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-fg/[0.08] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-fg/80"
          />
        </Field>

        <div>
          <label htmlFor="cert-pass" className={labelClass}>
            Contraseña del certificado
            <Help text="La que te dieron al descargarlo. Si el archivo no abre con ella, no la guardamos: te avisamos aquí mismo." />
          </label>
          <div className="relative">
            <input
              id="cert-pass"
              type={visible ? "text" : "password"}
              value={password}
              autoComplete="off"
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-20`}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11.5px] font-medium text-faint hover:bg-fg/[0.08] hover:text-fg/70"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-faint">
            Se guarda cifrada junto al certificado.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!file || !password || isPending}
          className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Subiendo…" : "Subir certificado"}
        </button>
        <p className="text-[12px] text-faint">
          Obtén tu certificado digital en SUNAT con tu RUC. Es gratuito.
        </p>
      </div>

      {error && <Callout tone="danger">{error}</Callout>}
      {warning && <Callout tone="warn">{warning}</Callout>}

      <Callout tone="info">
        Este certificado se almacena cifrado con AES-256 y nunca se comparte con otro
        restaurante ni con terceros. Solo se descifra en el servidor, en el momento de
        firmar un comprobante tuyo.
      </Callout>
    </div>
  );
}

/** Chunked so a multi-MB file does not blow the argument limit of String.fromCharCode. */
async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
