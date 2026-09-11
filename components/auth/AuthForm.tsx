"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck, IconEye, IconEyeOff } from "@/components/ui/Icons";

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 22, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="auth-card relative overflow-hidden rounded-2xl p-6 shadow-panel sm:p-9">
      <div aria-hidden className="absolute inset-x-8 top-0 h-px hairline-top opacity-80" />
      <div className="relative">
        <h1 className="max-w-[18ch] font-display text-[clamp(1.75rem,5vw,2.2rem)] font-bold leading-[1.08] tracking-[-0.035em] text-fg">{title}</h1>
        {description ? <p className="mt-3 max-w-[44ch] text-[14px] leading-6 text-muted">{description}</p> : null}
        {children}
        {footer ? <div className="mt-7 border-t border-fg/[0.07] pt-5">{footer}</div> : null}
      </div>
    </motion.section>
  );
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { label: string; icon?: ReactNode; labelAction?: ReactNode; endAction?: ReactNode; hint?: string };

export function AuthField({ label, icon, labelAction, endAction, hint, id, ...inputProps }: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4"><label htmlFor={inputId} className="text-[13px] font-semibold text-fg/75">{label}</label>{labelAction}</div>
      <div className="group relative">
        {icon ? <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-faint transition-colors group-focus-within:text-accent-icon">{icon}</span> : null}
        <input id={inputId} className={`h-12 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.035] text-[15px] text-fg caret-accent-400 outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-faint hover:border-fg/[0.16] focus:border-accent-400/55 focus:bg-fg/[0.055] focus:ring-4 focus:ring-accent-400/10 disabled:cursor-not-allowed disabled:opacity-55 ${icon ? "pl-11" : "pl-4"} ${endAction ? "pr-12" : "pr-4"}`} {...inputProps} />
        {endAction ? <span className="absolute inset-y-0 right-0 grid w-12 place-items-center">{endAction}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-[12px] leading-5 text-faint">{hint}</p> : null}
    </div>
  );
}

type PasswordFieldProps = Omit<AuthFieldProps, "type" | "endAction">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return <AuthField {...props} type={visible ? "text" : "password"} endAction={<button type="button" onClick={() => setVisible((current) => !current)} className="grid h-10 w-10 place-items-center rounded-lg text-faint outline-none transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:ring-2 focus-visible:ring-accent-400/70" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>{visible ? <IconEyeOff className="h-[18px] w-[18px]" /> : <IconEye className="h-[18px] w-[18px]" />}</button>} />;
}

export function PasswordRules({ password }: { password: string }) {
  const rules = [{ label: "8 caracteres", valid: password.length >= 8 }, { label: "Una mayúscula", valid: /[A-Z]/.test(password) }, { label: "Un número", valid: /\d/.test(password) }];
  return <ul className="grid grid-cols-2 gap-x-3 gap-y-2" aria-label="Requisitos de contraseña">{rules.map(({ label, valid }) => <li key={label} className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${valid ? "text-mint-ink" : "text-faint"}`}><span className={`grid h-4 w-4 place-items-center rounded-full border ${valid ? "border-mint/35 bg-mint/10" : "border-fg/[0.12]"}`}>{valid ? <IconCheck className="h-2.5 w-2.5" /> : null}</span>{label}</li>)}</ul>;
}

export function AuthAlert({ message }: { message: string }) {
  return <AnimatePresence initial={false}>{message ? <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-xl bg-accent-500/[0.09] px-3.5 py-3 text-[13px] leading-5 text-accent-ink ring-1 ring-inset ring-accent-500/20">{message}</motion.p> : null}</AnimatePresence>;
}

export function LoadingIndicator() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}
