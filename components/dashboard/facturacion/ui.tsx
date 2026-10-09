"use client";

import { useId, useState, type ReactNode } from "react";
import { fieldClass, labelClass } from "@/components/dashboard/menu/ui";
import type { FieldCheck } from "@/lib/billing/validation";

/**
 * Form primitives for Configuración → Facturación, design B.
 *
 * The page is long and mostly made of fields that are wrong until they are
 * right, so validation lives in the field itself: a rule function comes in,
 * the message appears under the input once the owner has left it (or as soon
 * as a value that was already wrong changes), and the same rule runs again on
 * the server. Nothing here knows what a RUC is — that is lib/billing/validation.
 */

// ---------------------------------------------------------------- accordion

const STATE_LABEL = { done: "Listo", pending: "Pendiente", optional: "Opcional" } as const;

export function Section({
  number,
  title,
  summary,
  status,
  open,
  onToggle,
  children,
}: {
  /** The step, drawn in the round badge until the section is done. */
  number: number;
  title: string;
  summary: string;
  /** What the owner still owes this section. */
  status: "done" | "pending" | "optional";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = useId();

  return (
    <section className={`lbd-card lbd-bl-sec${open ? " is-open" : ""}`}>
      <h3 style={{ margin: 0 }}>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="lbd-bl-sec-head">
          <span aria-hidden className="lbd-bl-badge lbd-mono" data-state={status}>
            {status === "done" ? "✓" : number}
          </span>
          <span className="lbd-bl-sec-text">
            <strong>{title}</strong>
            <small>{summary}</small>
          </span>
          <span className="lbd-bl-state" data-state={status}>
            {STATE_LABEL[status]}
          </span>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform .3s", transform: open ? "rotate(180deg)" : "none" }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="lbd-bl-sec-body lbd-swap">
        {children}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- fields

export function Field({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: FieldCheck;
  required?: boolean;
  className?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required && <span style={{ marginLeft: 4, color: "#ff7a57" }}>*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="lbd-bl-help" style={{ color: "#ffb39e" }}>
          {error}
        </p>
      ) : hint ? (
        <p className="lbd-bl-help">{hint}</p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Runs on blur, and on every keystroke once the field has been touched. */
  check?: (value: string) => FieldCheck;
  hint?: ReactNode;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "email" | "tel" | "url";
  digitsOnly?: boolean;
  uppercase?: boolean;
  mono?: boolean;
  className?: string;
  disabled?: boolean;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  check,
  hint,
  placeholder,
  required = false,
  maxLength,
  inputMode = "text",
  digitsOnly = false,
  uppercase = false,
  mono = false,
  className = "",
  disabled = false,
}: TextFieldProps) {
  const [touched, setTouched] = useState(false);
  const error = touched && check ? check(value) : null;

  return (
    <Field htmlFor={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        onBlur={() => setTouched(true)}
        onChange={(e) => {
          let next = e.target.value;
          if (digitsOnly) next = next.replace(/\D/g, "");
          if (uppercase) next = next.toUpperCase();
          onChange(next);
        }}
        className={`${fieldClass} ${mono ? "font-mono" : ""} ${error ? "!border-[rgba(255,90,51,0.55)]" : ""} disabled:opacity-40`}
      />
    </Field>
  );
}

/**
 * A stored secret is never sent back to the browser, so this field shows the
 * masked hint the server produced and only submits what the owner types over
 * it. Empty means "leave the stored one alone".
 */
export function SecretField({
  id,
  label,
  value,
  onChange,
  storedHint,
  onClear,
  check,
  hint,
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  storedHint: string | null;
  onClear?: () => void;
  check?: (value: string) => FieldCheck;
  hint?: ReactNode;
  placeholder?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  // A stored credential satisfies the field, so an empty box is only an error
  // when there is nothing on file either.
  const error = touched && check && !(storedHint && value === "") ? check(value) : null;

  return (
    <Field htmlFor={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          placeholder={storedHint ?? placeholder}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} pr-24 font-mono ${error ? "!border-[rgba(255,90,51,0.55)]" : ""}`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {storedHint && onClear && value === "" && (
            <button type="button" onClick={onClear} className="lbd-bl-mini">
              Quitar
            </button>
          )}
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar" : "Mostrar"} aria-pressed={visible} className="lbd-bl-mini">
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
    </Field>
  );
}

/** An on/off row, drawn as the prototype's switch. */
export function Toggle({
  checked,
  onChange,
  title,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  const on = checked && !disabled;
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="lbd-bl-switch">
      <span className="lbd-bl-switch-text">
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      <span className="lbd-bl-track" data-on={on}>
        <i />
      </span>
    </button>
  );
}

/** Small "?" that reveals a sentence — for the fields owners have never met. */
export function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button type="button" aria-label="Qué es esto" aria-expanded={open} onClick={() => setOpen((v) => !v)} onBlur={() => setOpen(false)} className="lbd-bl-q">
        ?
      </button>
      {open && (
        <span role="tooltip" className="lbd-bl-tip">
          {text}
        </span>
      )}
    </span>
  );
}

export function Callout({
  tone,
  title,
  children,
}: {
  tone: "warn" | "info" | "ok" | "danger";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="lbd-bl-callout" data-tone={tone}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
