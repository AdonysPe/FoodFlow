"use client";

import { useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { postAuth } from "@/lib/auth/client";

const inputClass = "h-12 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[15px] text-fg outline-none focus:border-accent-400/50 focus:ring-4 focus:ring-accent-400/10";

export default function RegisterForm() {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ role: "client" }>("/api/auth/register", { restaurant_name: restaurantName, email, password });
      if (result.ok) {
        window.location.href = "/dashboard/app/overview";
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
      <h1 className="font-display text-[1.4rem] font-bold text-fg">Crea tu restaurante</h1>
      <p className="mt-2 text-[14px] text-muted">Tu sesión quedará activa al terminar.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Nombre del restaurante" id="restaurant-name"><input id="restaurant-name" required minLength={2} maxLength={80} autoComplete="organization" value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} className={inputClass} /></Field>
        <Field label="Correo" id="register-email"><input id="register-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
        <Field label="Contraseña" id="register-password"><input id="register-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field>
        <Field label="Confirmar contraseña" id="register-confirmation"><input id="register-confirmation" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} /></Field>
        <p className="text-[12px] text-faint">Mínimo 8 caracteres, una mayúscula y un número.</p>
        {error && <p role="alert" className="rounded-lg border border-accent-500/20 bg-accent-500/[0.08] px-3.5 py-2.5 text-center text-[13px] text-accent-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={pending} icon={<IconArrowRight className="h-4 w-4" />}>{pending ? "Creando…" : "Crear cuenta"}</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-accent-icon hover:text-accent-ink">Ingresa</Link></p>
    </GlassCard>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg/70">{label}</label>{children}</div>;
}
