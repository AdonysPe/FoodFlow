"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff } from "@/components/ui/Icons";

/*
 * The pieces of every auth form, design B ("Noche"): the glass card, the
 * fields, the checkboxes, the alert and the button. Styles are the `lb-lg-*`
 * rules at the end of globals.css; the frame around them is AuthPageShell.
 */

export function AuthCard({
  title,
  description,
  children,
  footer,
  shake,
  onShakeEnd,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  shake?: boolean;
  onShakeEnd?: () => void;
}) {
  return (
    <section className={`lb-lg-card${shake ? " shake" : ""}`} onAnimationEnd={(event) => event.animationName.includes("shake") && onShakeEnd?.()}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="lb-lg-card-title">{title}</h1>
        {description ? <p className="lb-lg-desc">{description}</p> : null}
      </div>
      {children}
      {footer ? <p className="lb-lg-foot">{footer}</p> : null}
    </section>
  );
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  icon?: ReactNode;
  labelAction?: ReactNode;
  endAction?: ReactNode;
  hint?: string;
  invalid?: boolean;
};

export function AuthField({ label, icon, labelAction, endAction, hint, invalid, id, ...inputProps }: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="lb-lg-field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <label htmlFor={inputId}>{label}</label>
        {labelAction}
      </div>
      <div className={`lb-lg-input${endAction ? " lb-lg-input--end" : ""}${invalid ? " is-bad" : ""}`}>
        {icon}
        <input id={inputId} aria-invalid={invalid ? true : undefined} {...inputProps} />
        {endAction}
      </div>
      {hint ? <span className="lb-lg-hint">{hint}</span> : null}
    </div>
  );
}

type PasswordFieldProps = Omit<AuthFieldProps, "type" | "endAction">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      {...props}
      type={visible ? "text" : "password"}
      endAction={
        <button type="button" className="lb-lg-eye" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
          {visible ? <IconEyeOff className="h-[18px] w-[18px]" /> : <IconEye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}

export function PasswordRules({ password }: { password: string }) {
  const rules = [
    { label: "8 caracteres", valid: password.length >= 8 },
    { label: "Una mayúscula", valid: /[A-Z]/.test(password) },
    { label: "Un número", valid: /\d/.test(password) },
  ];
  return (
    <ul className="lb-lg-rules" aria-label="Requisitos de contraseña">
      {rules.map(({ label, valid }) => (
        <li key={label} className={valid ? "is-ok" : undefined}>
          <span aria-hidden>{valid ? <IconCheck className="h-2.5 w-2.5" /> : null}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}

type ConsentCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
  errorMessage?: string;
  children: ReactNode;
};

// Required, never pre-ticked — Ley 29733 asks for consent that is prior,
// express and informed. Same UX contract as the lead-capture form's consent
// box (components/lead/LeadForm.jsx), redrawn in the night design.
export function ConsentCheckbox({ id, checked, onChange, error, errorMessage, children }: ConsentCheckboxProps) {
  return (
    <div>
      <label htmlFor={id} className="lb-lg-checkrow">
        <input id={id} type="checkbox" className="lb-lg-check" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
        <span style={{ fontSize: 13, lineHeight: 1.55, color: "#b9b1a5" }}>{children}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="lb-lg-fielderror">
          {errorMessage ?? "Debes aceptar para continuar."}
        </p>
      ) : null}
    </div>
  );
}

type RememberCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
};

// An opt-in, never pre-ticked: staying signed in is a decision about one
// device, and the safe default on a shared tablet is to forget. It carries no
// legal meaning and nothing about it is required.
export function RememberCheckbox({ id, checked, onChange, disabled, label, hint }: RememberCheckboxProps) {
  return (
    <label htmlFor={id} className="lb-lg-checkrow">
      <input id={id} type="checkbox" className="lb-lg-check" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 14, fontWeight: 550 }}>{label}</span>
        {hint ? (
          <span id={`${id}-hint`} style={{ fontSize: 12, lineHeight: 1.45, color: "#a39b90" }}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** A note above a form: `accent` for something chosen (a plan), plain for information. */
export function AuthNotice({ children, icon, tone = "plain" }: { children: ReactNode; icon?: ReactNode; tone?: "plain" | "accent" }) {
  return (
    <div className={`lb-lg-notice${tone === "accent" ? " lb-lg-notice--accent" : ""}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function AuthAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="lb-pop lb-lg-alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5v.01" />
      </svg>
      {message}
    </div>
  );
}

export function LoadingIndicator() {
  return <span aria-hidden className="spin" />;
}

/** The orange call to action: spinner while pending, arrow otherwise. */
export function AuthSubmit({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button type="submit" className="lb-lg-submit" disabled={pending}>
      {pending ? <LoadingIndicator /> : null}
      {pending ? pendingLabel : label}
      {pending ? null : <IconArrowRight className="h-4 w-4" />}
    </button>
  );
}
