"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconMail, IconShield } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, LoadingIndicator } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSetup = searchParams.get("setup") === "1";

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
      setError("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title={isSetup ? "Crea tu contraseña" : "Recupera el acceso"} description={isSetup ? "Verificaremos tu correo para que puedas definir tu primera contraseña." : "Te enviaremos un código de 6 dígitos. Estará disponible durante 10 minutos."} footer={<p className="text-center text-[13px] text-muted"><Link href="/login" className="font-semibold text-accent-icon underline-offset-4 hover:underline">Volver al inicio de sesión</Link></p>}>
      <div className="mt-6 flex items-center gap-3 rounded-xl bg-fg/[0.035] px-3.5 py-3 text-[12.5px] leading-5 text-muted ring-1 ring-inset ring-fg/[0.07]"><IconShield className="h-5 w-5 shrink-0 text-accent-icon" />El código solo se enviará si el correo pertenece a una cuenta registrada.</div>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <AuthField id="forgot-email" label="Correo de tu cuenta" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@restaurante.com" disabled={pending} />
        <AuthAlert message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending} icon={pending ? <LoadingIndicator /> : <IconArrowRight className="h-4 w-4" />}>{pending ? "Enviando el código" : "Enviar código de acceso"}</Button>
      </form>
    </AuthCard>
  );
}
