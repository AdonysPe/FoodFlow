"use client";

import { useState } from "react";
import { checkDni, checkEmail, checkRequired, checkRuc } from "@/lib/billing/validation";
import type { FieldCheck } from "@/lib/billing/validation";

export type TillDocumentType = "boleta" | "factura" | "nota_venta";

export type TillCustomer = {
  docId: string;
  name: string;
  address: string;
  email: string;
};

export const EMPTY_CUSTOMER: TillCustomer = { docId: "", name: "", address: "", email: "" };

const OPTIONS: {
  value: TillDocumentType;
  label: string;
  sub: string;
}[] = [
  { value: "boleta", label: "Boleta", sub: "DNI" },
  { value: "factura", label: "Factura", sub: "RUC" },
  { value: "nota_venta", label: "Ticket", sub: "sin documento" },
];

/**
 * Componente 5 — qué comprobante se emite y a nombre de quién.
 *
 * Written for a waiter holding a phone next to a table, so the three options
 * are one row of big targets and the fields under them change with the choice
 * instead of appearing all at once. A factura asks for everything SUNAT
 * demands; a boleta asks for nothing it does not need.
 */
export default function DocumentPicker({
  type,
  customer,
  onType,
  onCustomer,
  /** Componente 8: the electronic options are dead until the venue configures. */
  electronicEnabled,
}: {
  type: TillDocumentType;
  customer: TillCustomer;
  onType: (t: TillDocumentType) => void;
  onCustomer: (c: TillCustomer) => void;
  electronicEnabled: boolean;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function set<K extends keyof TillCustomer>(key: K, value: string) {
    onCustomer({ ...customer, [key]: value });
  }

  function show(field: string, problem: FieldCheck): FieldCheck {
    return touched[field] ? problem : null;
  }

  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fg/35">
        Tipo de comprobante
      </p>

      <div role="radiogroup" aria-label="Tipo de comprobante" className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const disabled = opt.value !== "nota_venta" && !electronicEnabled;
          const active = type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onType(opt.value)}
              className={`flex h-16 flex-col items-center justify-center rounded-xl border text-[14px] font-semibold transition-colors active:scale-[0.97] disabled:opacity-30 ${
                active
                  ? "border-accent-400/60 bg-accent-400/15 text-accent-label"
                  : "border-fg/[0.1] bg-fg/[0.03] text-fg/70"
              }`}
            >
              {opt.label}
              <span className="mt-0.5 text-[11px] font-normal text-fg/40">{opt.sub}</span>
            </button>
          );
        })}
      </div>

      {type === "nota_venta" && (
        <p className="mt-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-fg/45">
          Se imprime a nombre de <span className="font-medium text-fg/70">CONSUMIDOR FINAL</span>,
          sin pedirle documento al comensal.
        </p>
      )}

      {type === "boleta" && (
        <div className="mt-4 flex flex-col gap-3">
          <TillField
            id="doc-dni"
            label="DNI del cliente"
            hint="Opcional, pero pídelo si el consumo pasa de S/700."
            value={customer.docId}
            onChange={(v) => set("docId", v.replace(/\D/g, ""))}
            onBlur={() => setTouched((t) => ({ ...t, docId: true }))}
            error={show("docId", customer.docId ? checkDni(customer.docId) : null)}
            inputMode="numeric"
            maxLength={8}
            placeholder="70123456"
          />
          <TillField
            id="doc-name"
            label="Nombre del cliente"
            hint="Opcional."
            value={customer.name}
            onChange={(v) => set("name", v)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            maxLength={160}
            placeholder="María Ramos"
          />
          <TillField
            id="doc-email"
            label="Correo electrónico"
            hint="Opcional. Si lo llenas, le llega el PDF."
            value={customer.email}
            onChange={(v) => set("email", v)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={show("email", customer.email ? checkEmail(customer.email) : null)}
            inputMode="email"
            maxLength={160}
            placeholder="maria@correo.com"
          />
        </div>
      )}

      {type === "factura" && (
        <div className="mt-4 flex flex-col gap-3">
          <TillField
            id="doc-ruc"
            label="RUC del cliente"
            required
            value={customer.docId}
            onChange={(v) => set("docId", v.replace(/\D/g, ""))}
            onBlur={() => setTouched((t) => ({ ...t, docId: true }))}
            error={show("docId", checkRuc(customer.docId))}
            inputMode="numeric"
            maxLength={11}
            placeholder="20123456789"
          />
          <TillField
            id="doc-legal"
            label="Razón social"
            required
            value={customer.name}
            onChange={(v) => set("name", v)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={show("name", checkRequired(customer.name, "La razón social"))}
            maxLength={160}
            placeholder="Comercial Andina S.A.C."
          />
          <TillField
            id="doc-address"
            label="Dirección"
            required
            value={customer.address}
            onChange={(v) => set("address", v)}
            onBlur={() => setTouched((t) => ({ ...t, address: true }))}
            error={show("address", checkRequired(customer.address, "La dirección"))}
            maxLength={200}
            placeholder="Av. Javier Prado 456, San Isidro"
          />
          <TillField
            id="doc-femail"
            label="Correo electrónico"
            required
            hint="Obligatorio: ahí llegan el XML y el PDF."
            value={customer.email}
            onChange={(v) => set("email", v)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={show("email", checkEmail(customer.email, { required: true }))}
            inputMode="email"
            maxLength={160}
            placeholder="facturacion@empresa.com"
          />
        </div>
      )}
    </div>
  );
}

function TillField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required = false,
  maxLength,
  inputMode = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: FieldCheck;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "email";
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-fg/45">
        {label}
        {required && <span className="ml-1 text-accent-label">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`h-12 w-full rounded-xl border bg-fg/[0.05] px-4 text-[15px] text-fg placeholder:text-fg/25 outline-none transition-colors focus:border-accent-400/50 ${
          error ? "border-accent-400/60" : "border-fg/[0.12]"
        }`}
      />
      {error ? (
        <p role="alert" className="mt-1 text-[11.5px] text-accent-label">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-fg/30">{hint}</p>
      ) : null}
    </div>
  );
}
