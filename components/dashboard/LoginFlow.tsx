"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconLock, IconMail } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, LoadingIndicator, PasswordField, RememberCheckbox } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

type SessionRole = "platform_admin" | "restaurant_owner" | "restaurant_admin" | "restaurant_staff";

function targetForRole(role: SessionRole, next: string | null) {
  if (next?.startsWith("/dashboard")) return next;
  if (role === "platform_admin") return "/dashboard/admin/overview";
  if (role === "restaurant_staff") return "/dashboard/comanda";
  return "/dashboard/app/overview";
}

export default function LoginFlow() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ role: SessionRole }>("/api/auth/login", { email, password, remember });
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
      setError("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Qué bueno verte de nuevo" description="Ingresa para continuar con la operación de tu restaurante." footer={<p className="text-center text-[13px] text-muted">¿Aún no tienes cuenta?{" "}<Link href="/register" className="font-semibold text-accent-icon underline-offset-4 hover:underline">Crea tu restaurante</Link></p>}>
      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
        <AuthField id="login-email" label="Correo" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@restaurante.com" disabled={pending} />
        <PasswordField id="login-password" label="Contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} labelAction={<Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-[12px] font-semibold text-accent-icon underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link>} />
        <RememberCheckbox id="login-remember" checked={remember} onChange={setRemember} disabled={pending} label="Mantener sesión iniciada en este dispositivo" hint="Hasta 30 días. Úsalo solo en tu propio equipo; en uno compartido, déjalo sin marcar." />
        <AuthAlert message={error} />
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending} icon={pending ? <LoadingIndicator /> : <IconArrowRight className="h-4 w-4" />}>{pending ? "Ingresando" : "Ingresar a FoodFlow"}</Button>
      </form>
    </AuthCard>
  );
}
