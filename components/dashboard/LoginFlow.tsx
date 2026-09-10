"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { postAuth } from "@/lib/auth/client";

const inputClass =
  "h-12 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[15px] text-fg placeholder:text-faint outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-fg/[0.06] focus:ring-4 focus:ring-accent-400/10";

function targetForRole(role: "admin" | "client" | "mozo", next: string | null) {
  if (next?.startsWith("/dashboard")) return next;
  if (role === "admin") return "/dashboard/admin/overview";
  if (role === "mozo") return "/dashboard/comanda";
  return "/dashboard/app/overview";
}

export default function LoginFlow() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ role: "admin" | "client" | "mozo" }>(
        "/api/auth/login",
        { email, password }
      );
      if (result.ok) {
        window.location.href = targetForRole(result.data.role, searchParams.get("next"));
        return;
      }
      if (result.code === "password_setup_required") {
        window.location.href = `/forgot-password?email=${encodeURIComponent(email)}&setup=1`;
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
      <h1 className="font-display text-[1.4rem] font-bold tracking-[-0.02em] text-fg">
        Entra a FoodFlow
      </h1>
      <p className="mt-2 text-[14px] text-muted">Ingresa con tu correo y contraseña.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-fg/70">Correo</label>
          <input id="login-email" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@restaurante.com" className={inputClass} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label htmlFor="login-password" className="text-[13px] font-medium text-fg/70">Contraseña</label>
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-[12.5px] text-accent-icon hover:text-accent-ink">¿Olvidaste tu contraseña?</Link>
          </div>
          <input id="login-password" type="password" required minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-accent-500/20 bg-accent-500/[0.08] px-3.5 py-2.5 text-center text-[13px] text-accent-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={pending} icon={<IconArrowRight className="h-4 w-4" />}>
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-accent-icon hover:text-accent-ink">Crea tu restaurante</Link>
      </p>
    </GlassCard>
  );
}
