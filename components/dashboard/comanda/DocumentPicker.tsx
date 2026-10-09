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
      <p className="lbd-cm-eyebrow" style={{ margin: "0 0 8px" }}>
        Tipo de comprobante
      </p>

      <div role="radiogroup" aria-label="Tipo de comprobante" className="lbd-cm-docs">
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
              className={`lbd-cm-doc${active ? " is-on" : ""}`}
            >
              {opt.label}
              <span>{opt.sub}</span>
            </button>
          );
        })}
      </div>

      {type === "nota_venta" && (
        <p className="lbd-cm-note">
          Se imprime a nombre de <strong>CONSUMIDOR FINAL</strong>, sin pedirle documento al comensal.
        </p>
      )}

      {type === "boleta" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
      <label htmlFor={id} style={{ display: "block", marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: "#d7d0c5" }}>
        {label}
        {required && <span style={{ marginLeft: 4, color: "#ff7a57" }}>*</span>}
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
        className="lbd-input"
        style={{ height: 50, borderColor: error ? "rgba(255,90,51,0.6)" : undefined }}
      />
      {error ? (
        <p role="alert" style={{ margin: "4px 0 0", fontSize: 12, color: "#ffb39e" }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8a8278" }}>{hint}</p>
      ) : null}
    </div>
  );
}
