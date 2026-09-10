"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { postAuth } from "@/lib/auth/client";

const inputClass = "h-12 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[15px] text-fg outline-none focus:border-accent-400/50 focus:ring-4 focus:ring-accent-400/10";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ message: string }>("/api/auth/reset-password", { email, code, password });
      if (result.ok) {
        setDone(true);
        return;
      }
      setError(result.error);
    } catch {
      setError("Problema de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <GlassCard className="w-full max-w-md p-7 text-center sm:p-9" hoverLift={false}>
        <IconCheck className="mx-auto h-8 w-8 text-mint-ink" />
        <h1 className="mt-4 font-display text-[1.4rem] font-bold text-fg">Contraseña actualizada</h1>
        <p className="mt-2 text-[14px] text-muted">Todas tus sesiones anteriores fueron cerradas.</p>
        <Link href="/login" className="mt-6 inline-flex font-semibold text-accent-icon hover:text-accent-ink">Ingresar</Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-md p-7 sm:p-9" hoverLift={false}>
      <h1 className="font-display text-[1.4rem] font-bold text-fg">Define una nueva contraseña</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Correo" id="reset-email"><input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
        <Field label="Código de 6 dígitos" id="reset-code"><input id="reset-code" required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} /></Field>
        <Field label="Nueva contraseña" id="reset-password"><input id="reset-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field>
        <Field label="Confirmar contraseña" id="reset-confirmation"><input id="reset-confirmation" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} /></Field>
        <p className="text-[12px] text-faint">Mínimo 8 caracteres, una mayúscula y un número. Máximo 3 intentos por código.</p>
        {error && <p role="alert" className="rounded-lg border border-accent-500/20 bg-accent-500/[0.08] px-3.5 py-2.5 text-center text-[13px] text-accent-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={pending} icon={<IconArrowRight className="h-4 w-4" />}>{pending ? "Actualizando…" : "Actualizar contraseña"}</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted"><Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="font-semibold text-accent-icon hover:text-accent-ink">Solicitar otro código</Link></p>
    </GlassCard>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg/70">{label}</label>{children}</div>;
}
