"use client";

import { useId, useState, type ReactNode } from "react";
import { fieldClass, labelClass } from "@/components/dashboard/menu/ui";
import type { FieldCheck } from "@/lib/billing/validation";

/**
 * Form primitives for Configuración → Facturación.
 *
 * The page is long and mostly made of fields that are wrong until they are
 * right, so validation lives in the field itself: a rule function comes in,
 * the message appears under the input once the owner has left it (or as soon
 * as a value that was already wrong changes), and the same rule runs again on
 * the server. Nothing here knows what a RUC is — that is lib/billing/validation.
 */

// ---------------------------------------------------------------- accordion

export function Section({
  title,
  summary,
  status,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  /** Dot in the header: what the owner still owes this section. */
  status: "done" | "pending" | "optional";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = useId();
  const dot =
    status === "done"
      ? "bg-ok"
      : status === "pending"
        ? "bg-accent-400"
        : "bg-fg/20";

  return (
    <section className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.02]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-fg/[0.03]"
        >
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-fg">{title}</span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-fg/45">
              {summary}
            </span>
          </span>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`h-4 w-4 shrink-0 text-fg/35 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="border-t border-fg/[0.06] px-5 py-5">
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
        {required && <span className="ml-1 text-accent-label">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-accent-label">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-fg/35">{hint}</p>
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
    <Field
      htmlFor={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
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
        className={`${fieldClass} ${mono ? "font-mono" : ""} ${
          error ? "border-accent-400/60" : ""
        } disabled:opacity-40`}
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
          className={`${fieldClass} pr-24 font-mono ${error ? "border-accent-400/60" : ""}`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {storedHint && onClear && value === "" && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2 py-1 text-[11.5px] font-medium text-fg/40 hover:bg-fg/[0.08] hover:text-fg/70"
            >
              Quitar
            </button>
          )}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar" : "Mostrar"}
            aria-pressed={visible}
            className="rounded-md px-2 py-1 text-[11.5px] font-medium text-fg/40 hover:bg-fg/[0.08] hover:text-fg/70"
          >
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
    </Field>
  );
}

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
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3 ${
        disabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent-500)]"
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-fg/85">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-fg/40">{hint}</span>
      </span>
    </label>
  );
}

/** Small "?" that reveals a sentence — for the fields owners have never met. */
export function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Qué es esto"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-fg/20 text-[9px] font-bold text-fg/45 hover:border-fg/40 hover:text-fg/70"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-fg/[0.12] bg-ink-900 px-3 py-2 text-[11.5px] leading-relaxed font-normal text-fg/70 shadow-lift"
        >
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
  const skin = {
    warn: "border-amber-400/25 bg-amber-400/[0.07] text-amber-200",
    info: "border-fg/[0.1] bg-fg/[0.03] text-fg/70",
    ok: "border-ok/30 bg-ok/[0.08] text-ok-ink",
    danger: "border-accent-400/30 bg-accent-400/10 text-accent-label",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${skin}`}>
      {title && <p className="text-[13px] font-semibold">{title}</p>}
      <div className={`text-[12.5px] leading-relaxed ${title ? "mt-1 text-fg/55" : ""}`}>
        {children}
      </div>
    </div>
  );
}
