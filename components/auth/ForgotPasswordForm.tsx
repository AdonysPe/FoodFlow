"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { postAuth } from "@/lib/auth/client";

const inputClass = "h-12 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[15px] text-fg outline-none focus:border-accent-400/50 focus:ring-4 focus:ring-accent-400/10";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ message: string }>("/api/auth/forgot-password", { email });
      if (result.ok) {
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
        return;
      }
      setError(result.error);
    } catch {
      setError("Problema de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <GlassCard className="w-full max-w-md p-7 sm:p-9" hoverLift={false}>
      <h1 className="font-display text-[1.4rem] font-bold text-fg">
        {searchParams.get("setup") === "1" ? "Crea tu contraseña" : "Recupera tu contraseña"}
      </h1>
      <p className="mt-2 text-[14px] text-muted">Te enviaremos un código válido durante 10 minutos.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-[13px] font-medium text-fg/70">Correo</label>
          <input id="forgot-email" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-accent-500/20 bg-accent-500/[0.08] px-3.5 py-2.5 text-center text-[13px] text-accent-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={pending} icon={<IconArrowRight className="h-4 w-4" />}>{pending ? "Enviando…" : "Enviar código"}</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted"><Link href="/login" className="font-semibold text-accent-icon hover:text-accent-ink">Volver al login</Link></p>
    </GlassCard>
  );
}
